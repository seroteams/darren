import "./env-boot.ts"; // MUST be first — loads .env before any module reads env at load time

import http from "node:http";
import path from "node:path";
import type { IncomingMessage } from "node:http";

import { ROOT } from "../engine/paths.mts";
import { createRouter, type RouteHandler } from "./router.ts";
import { createStaticHandler } from "./static.ts";
import { startSweep } from "./sessions.ts";
import { getBuildInfo } from "./build-info.ts";
import { runMigrations } from "../db/migrate.ts";
import { runEnvironmentGuard, EnvGuardError, resolveAppEnv } from "../db/env-guard.ts";
import { flushArtifactWrites } from "../db/run-artifacts-store.ts";
import { hydrateQuestionCache, flushQuestionWrites } from "../db/questions-store.ts";
import { hydrateArcOverlays, flushArcOverlayWrites } from "../db/arc-overlays-store.ts";
import { hydrateRoleProfiles, flushRoleProfileWrites } from "../db/role-profiles-store.ts";
import { flushTraceWrites } from "../engine/lexicon/candidates-io.ts";
import { flushSessionWrites, setMirrorFailureSink } from "../db/sessions-store.ts";
import { logSystemError } from "./middleware/error-log.ts";
import { PROFILES_DIR } from "../engine/role-profile.ts";
import { OVERLAYS_DIR } from "../engine/arc-overlay.ts";
import { hasDatabaseUrl } from "../db/client.ts";

import * as arcs from "./services/arcs/arcs.controller.ts";
import * as auth from "./services/auth/auth.controller.ts";
import { pgAuthSessionRepo, pgPasswordResetRepo } from "./services/auth/auth.repo.ts";
import * as catalog from "./services/catalog/catalog.controller.ts";
import { v1Route } from "./middleware/v1-route.ts";
import { originOk } from "./middleware/origin.ts";
import { requireSuperadminRoute } from "./middleware/superadmin-guard.ts";
import { requireInternalToolRoute, blockOnLive } from "./middleware/internal-tool-guard.ts";
import { forbidden, rateLimited } from "./middleware/http-error.ts";
import * as sessions from "./services/sessions/sessions.controller.ts";
import * as runs from "./services/runs/runs.controller.ts";
import * as team from "./services/team/team.controller.ts";
import * as guided from "./services/guided-sessions/guided-sessions.controller.ts";
import * as trackers from "./services/trackers/trackers.controller.ts";
import * as invites from "./services/invites/invites.controller.ts";
import * as members from "./services/members/members.controller.ts";
import * as lexiconPromote from "./services/lexicon/lexicon.controller.ts";
import * as roleLexicons from "./services/role-lexicons/role-lexicons.controller.ts";
import * as regression from "./services/regression/regression.controller.ts";
import * as personaRuns from "./services/persona-runs/persona-runs.controller.ts";
import * as suggestFix from "./services/suggest-fix/suggest-fix.controller.ts";
import library from "./services/library/library.controller.ts";
import * as feedback from "./services/feedback/feedback.controller.ts";
import * as superadmin from "./services/superadmin/superadmin.controller.ts";
import * as heartbeat from "./services/heartbeat/heartbeat.controller.ts";
import * as errorLog from "./services/error-log/error-log.controller.ts";
import { health, healthDeep } from "./services/health/health.controller.ts";

const IS_PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.API_PORT || process.env.PORT || (IS_PROD ? 3000 : 3001));
// The public deploy serves the CUSTOMER app at "/" and — since admin-live-deploy Phase 2
// (reversing frontend-admin-split Phase 4's "admin never ships") — the ADMIN console under
// "/admin" for the superadmin. The admin app is built with vite base "/admin/" and gated by
// the Phase-1 internal-tool fence + superadmin routes. Proven by scripts/test-customer-serving.js
// (customer bundle fence) and scripts/test-admin-serving.js (both apps served at the right paths).
const CLIENT_DIST = path.join(ROOT, "frontend", "dist");
const ADMIN_DIST = path.join(ROOT, "admin", "dist");

// Simple per-IP rate limiter for session creation (POST /api/start).
// Allows up to MAX_PER_IP new sessions within WINDOW_MS before returning 429.
const RATE_WINDOW_MS = 60_000;
const MAX_PER_IP = 5;
const ipCounts = new Map<string, number>();
setInterval(() => ipCounts.clear(), RATE_WINDOW_MS).unref?.();

// The caller's IP, used to key every per-IP rate limiter. Take the LAST
// x-forwarded-for hop — the value our own proxy (Render) appended — not the first.
// The first hop is client-supplied and can be spoofed to dodge the limiters
// (audit F11); the last hop is the trustworthy one behind a single known proxy.
function clientIp(req: IncomingMessage): string {
  const xff = req.headers["x-forwarded-for"];
  const hops = typeof xff === "string" ? xff.split(",").map((h) => h.trim()).filter(Boolean) : [];
  const fromXff = hops.length ? hops[hops.length - 1] : undefined;
  return fromXff || req.socket?.remoteAddress || "unknown";
}

function rateLimitIp(req: IncomingMessage): boolean {
  const ip = clientIp(req);
  const count = (ipCounts.get(ip) || 0) + 1;
  ipCounts.set(ip, count);
  return count > MAX_PER_IP;
}

// Per-IP cap on client error reports (error-log Phase 3) — a backstop behind the app's own
// throttle so a crash loop can't flood error_logs. Generous: legitimate bursts are a few.
const MAX_ERROR_REPORTS_PER_IP = 30;
const errorReportCounts = new Map<string, number>();
setInterval(() => errorReportCounts.clear(), RATE_WINDOW_MS).unref?.();

function rateLimitErrors(req: IncomingMessage): boolean {
  const ip = clientIp(req);
  const count = (errorReportCounts.get(ip) || 0) + 1;
  errorReportCounts.set(ip, count);
  return count > MAX_ERROR_REPORTS_PER_IP;
}

// Per-IP cap on password-reset requests (forgot-password) — stops someone spamming reset
// emails at a victim's inbox. Its own counter so it never collides with session creation.
const MAX_RESET_PER_IP = 5;
const resetCounts = new Map<string, number>();
setInterval(() => resetCounts.clear(), RATE_WINDOW_MS).unref?.();

function rateLimitReset(req: IncomingMessage): boolean {
  const ip = clientIp(req);
  const count = (resetCounts.get(ip) || 0) + 1;
  resetCounts.set(ip, count);
  return count > MAX_RESET_PER_IP;
}

// Per-IP cap on login + register attempts (audit F3) — the one sensitive door that
// had no limiter, so online password guessing (and signup/notification spam) was
// unbounded. Own counter, generous enough that a real person fat-fingering a
// password a few times is never caught: 10 tries a minute per IP.
const MAX_AUTH_PER_IP = 10;
const authAttemptCounts = new Map<string, number>();
setInterval(() => authAttemptCounts.clear(), RATE_WINDOW_MS).unref?.();

function rateLimitAuth(req: IncomingMessage): boolean {
  const ip = clientIp(req);
  const count = (authAttemptCounts.get(ip) || 0) + 1;
  authAttemptCounts.set(ip, count);
  return count > MAX_AUTH_PER_IP;
}

function warnIfNoKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("\x1b[33m[warn] OPENAI_API_KEY not set — AI stages will fail on first call.\x1b[0m");
    console.warn("       bash:       export OPENAI_API_KEY=sk-...");
    console.warn("       PowerShell: $env:OPENAI_API_KEY='sk-...'");
  }
}


// Internal tooling (admin-live-deploy Phase 1; was adminV1/adminRaw from admin-access-guard
// Phase 2): a logged-in manager/admin locally, superadmin-only when the app runs as LIVE —
// these routes edit the GLOBAL engine config (arcs, role words, lexicon promotions) or expose
// repo internals (heartbeat, library), so live customers must never reach them. internalV1
// keeps the one v1 error shape; internalRaw wraps the library stream, which manages its own
// response. (Runs endpoints gate themselves in the controller via requireAdmin.)
const internalV1 = (h: RouteHandler): RouteHandler => v1Route(requireInternalToolRoute(h));
const internalRaw = (h: RouteHandler): RouteHandler => requireInternalToolRoute(h);

// Superadmin tooling (pre-go-live PG6) — cross-company, gated to the SUPERADMIN_EMAILS
// allowlist. Every /api/v1/admin/* route funnels through requireSuperadminRoute, so a route
// can't be added here un-gated, and every access (read or write) is audited. Reads only until
// user-management Phase 2 added the first mutation (PATCH role); mutations are origin-guarded
// too. The per-company fence for every other path is untouched.
const superadminV1 = (h: RouteHandler): RouteHandler => v1Route(requireSuperadminRoute(h));

async function main(): Promise<void> {
  warnIfNoKey();

  // Postgres boot order (postgres-runtime-data Phase 1): apply pending migrations,
  // then let the DB assert which environment it belongs to — BEFORE anything reads
  // or writes it. A refused mismatch is fatal on purpose: better a server that
  // won't start than a local app writing into the live database.
  try {
    await runMigrations();
    await runEnvironmentGuard();
  } catch (e) {
    if (e instanceof EnvGuardError) {
      console.error(`\n  \x1b[1;31mEnvironment mismatch\x1b[0m — ${e.message}\n`);
      process.exit(1);
    }
    throw e;
  }

  // A live deploy with no database is a data-loss trap (audit F1): every write would
  // silently land on Render's ephemeral disk and vanish on the next restart. Refuse to
  // start rather than run in that state — better a loud failure than quiet loss.
  if (resolveAppEnv() === "live" && !hasDatabaseUrl()) {
    console.error(
      "\n  \x1b[1;31mNo database on a live deploy\x1b[0m — DATABASE_URL is not set. " +
        "Refusing to start so customer data can't be written to disk that a restart wipes. " +
        "Set DATABASE_URL in the Render dashboard.\n",
    );
    process.exit(1);
  }

  // The engine's question reads are synchronous — hydrate the DB-backed pool
  // BEFORE any route can run a stage (postgres-runtime-data Phase 4). Reading
  // unhydrated is a loud error by design, never a silent empty pool.
  if (hasDatabaseUrl()) {
    // Three independent caches — warm them together so a cold boot (Render's free
    // tier sleeps) waits on the slowest, not the sum.
    await Promise.all([
      hydrateQuestionCache(),
      hydrateArcOverlays(OVERLAYS_DIR),
      hydrateRoleProfiles(PROFILES_DIR),
    ]);
  }

  startSweep();

  // Escalate repeated session mirror-write failures into the superadmin Error log
  // (audit F8) — otherwise a run silently living only in memory dies on the next
  // restart with nothing but a console.warn to show for it.
  setMirrorFailureSink((key, message) => {
    void logSystemError(`sessions.pg mirror (${key})`, message);
  });

  // Periodically delete expired login sessions + used/expired reset tokens (audit F13).
  // Expiry is already enforced at read time; this just stops dead rows (now hashed) piling
  // up forever. Hourly, best-effort — a failed purge is a warning, never fatal.
  if (hasDatabaseUrl()) {
    const purgeExpired = (): void => {
      void pgAuthSessionRepo.deleteExpired().catch((e) => console.warn("[db] session purge failed:", e));
      void pgPasswordResetRepo.deleteExpired().catch((e) => console.warn("[db] reset-token purge failed:", e));
    };
    purgeExpired();
    setInterval(purgeExpired, 60 * 60 * 1000).unref?.();
  }

  const router = createRouter();

  // version — the running API's build id (git short SHA + commit date), captured
  // at boot. Lets the app show which build is live so a stale server is obvious.
  router.add("GET", "/api/version", (c) => c.json(200, getBuildInfo()));

  // health — public liveness probe for Render's health check and the /release
  // watch loop. No auth on purpose.
  router.add("GET", "/api/v1/health", v1Route(health));
  // deep readiness probe (audit F17) — pings the DB so a wedged instance stops
  // reporting healthy. Auth-free + unlinked, for the /release watch loop.
  router.add("GET", "/api/v1/health/deep", v1Route(healthDeep));

  // auth — register + login (Phase 006). v1-only (no legacy alias): new endpoints,
  // the one error shape from the start.
  // register + login are origin-guarded like every other mutating route (audit F10 —
  // stops login-CSRF logging a victim into an attacker's account) and per-IP
  // rate-limited (audit F3 — caps online password guessing + signup/email spam).
  router.add("POST", "/api/v1/auth/register", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    if (rateLimitAuth(c.req)) throw rateLimited("Too many attempts — try again in a minute.");
    return auth.register(c);
  }));
  router.add("POST", "/api/v1/auth/login", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    if (rateLimitAuth(c.req)) throw rateLimited("Too many attempts — try again in a minute.");
    return auth.login(c);
  }));
  router.add("POST", "/api/v1/auth/logout", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return auth.logout(c);
  }));
  router.add("GET", "/api/v1/auth/me", v1Route(auth.me));

  // forgot password (forgot-password): request a reset link, then set a new password with
  // the token. Both PUBLIC (a logged-out user forgot their password) and origin-guarded
  // like the other mutating routes. The request is rate-limited so it can't be used to
  // flood a victim's inbox; it always answers a generic 200 (no account-existence leak).
  router.add("POST", "/api/v1/auth/forgot-password", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    if (rateLimitReset(c.req)) throw rateLimited("Too many reset requests — try again in a minute.");
    return auth.forgotPassword(c);
  }));
  router.add("POST", "/api/v1/auth/reset-password", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return auth.resetPassword(c);
  }));
  // change password (audit M12): the SIGNED-IN manager changes their own. Protected
  // (requireAuth inside the handler) + origin-guarded like the other mutating routes; the
  // user id is taken from the session, so a caller can only ever change their own password.
  router.add("POST", "/api/v1/auth/change-password", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return auth.changePassword(c);
  }));

  // feedback — a tester's in-app note (Phase 5; feedback-inbox moved the store to the
  // feedback_notes table). Login required (any role, not admin); no external service.
  // Origin-guarded like the other mutating v1 routes.
  router.add("POST", "/api/v1/feedback", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return feedback.submit(c);
  }));
  // briefing verdict tap (validation-kit Phase 3) — one yes/no per run at the moment
  // of value. No login wall (a guest's tap counts); origin-guarded like the error
  // reports, and the service upserts so re-taps can't pile up rows.
  router.add("POST", "/api/v1/feedback/verdict", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return feedback.submitVerdict(c);
  }));

  // client error reports (error-log Phase 3) — the app POSTs a browser crash / failed load
  // here so it lands in the same error_logs table (source "browser"). Not superadmin-gated
  // (any visitor's own error), origin-guarded + rate-limited; recording is best-effort.
  router.add("POST", "/api/v1/errors", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    if (rateLimitErrors(c.req)) throw rateLimited("Too many error reports");
    return errorLog.report(c);
  }));

  // superadmin — cross-company view of the alpha (pre-go-live PG6/PG7/PG8), behind the
  // SUPERADMIN_EMAILS allowlist. Reads below; the one mutation (change a user's role,
  // user-management Phase 2) is origin-guarded like every other mutating route.
  router.add("GET", "/api/v1/admin/registered", superadminV1(superadmin.registered));
  router.add("GET", "/api/v1/admin/pulse", superadminV1(superadmin.pulse));
  router.add("GET", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)\/runs$/, superadminV1(superadmin.userRuns));
  router.add("GET", "/api/v1/admin/guest-runs", superadminV1(superadmin.guestRuns));
  // The exact path lists every run (pulse-drilldowns); the regex below needs an id segment,
  // so the two can't collide.
  router.add("GET", "/api/v1/admin/runs", superadminV1(superadmin.adminRuns));
  router.add("GET", /^\/api\/v1\/admin\/runs\/(?<id>[^/]+)$/, superadminV1(superadmin.runDetail));
  router.add("PATCH", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)\/role$/, superadminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return superadmin.setRole(c);
  }));
  router.add("POST", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)\/deactivate$/, superadminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return superadmin.deactivate(c);
  }));
  router.add("POST", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)\/reactivate$/, superadminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return superadmin.reactivate(c);
  }));
  router.add("DELETE", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)$/, superadminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return superadmin.deleteUser(c);
  }));
  // error log — the superadmin's cross-company view of every error users hit (error-log
  // Phase 2). Superadmin-gated like the rest of /admin/*; read-only, newest first.
  router.add("GET", "/api/v1/admin/errors", superadminV1(errorLog.list));
  router.add("PATCH", /^\/api\/v1\/admin\/errors\/(?<id>[^/]+)\/resolve$/, superadminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return errorLog.resolve(c);
  }));
  // feedback inbox — the superadmin's cross-company view of every tester note, newest
  // first. Same gate as the error log; read-only.
  router.add("GET", "/api/v1/admin/feedback", superadminV1(feedback.list));
  router.add("DELETE", /^\/api\/v1\/admin\/feedback\/(?<id>[^/]+)$/, superadminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return feedback.remove(c);
  }));

  // catalog — first domain on the v1 layer (controller → service → repo).
  // v1 routes use the one error shape (v1Route).
  router.add("GET", "/api/v1/meeting-types", v1Route(catalog.getMeetingTypes));
  router.add("GET", "/api/v1/personas", v1Route(catalog.getPersonas));
  // arcs (controller → service → repo). v1 uses the one error shape and throws
  // forbidden on bad origin.
  // v1 mirrors today's verb/path (POST save); the contract's PATCH is deferred polish.
  router.add("GET", "/api/v1/arcs", internalV1(arcs.list));
  router.add("POST", /^\/api\/v1\/arcs\/(?<slug>[a-z0-9_]+)\/reset$/, internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return arcs.reset(c);
  }));
  router.add("POST", /^\/api\/v1\/arcs\/(?<slug>[a-z0-9_]+)$/, internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return arcs.save(c);
  }));
  // start — create a session (controller → service → repo + S0 seam; the AI
  // pre-warm is injected). The origin guard + per-IP rate limit are HTTP concerns,
  // so they stay here in front of the route. v1 creates on the collection
  // (POST /api/v1/sessions, decision D4) with the one error shape. The role gate
  // moved INTO the controller (guest-run Phase 1): anonymous guests may start (a
  // shared daily budget caps them), admins/managers start uncapped, and a plain
  // member is still a real 403 (member-view: only-runs), not just hidden UI.
  router.add("POST", "/api/v1/sessions", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    if (rateLimitIp(c.req)) throw rateLimited("Rate limit exceeded");
    return sessions.start(c);
  }));
  // claim — a logged-in caller takes ownership of an ownerless guest run (guest-run
  // Phase 1). Auth enforced in the controller (any role); origin-guarded like every
  // other mutating v1 route.
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/claim$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.claim(c);
  }));
  // sessions — the live 1:1 runner (controller → service → repo, the S0 seam). v1
  // takes the id IN THE PATH (/api/v1/sessions/:id…, decision D4) with the one error
  // shape. S1a: the two pure session-state reads (snapshot + lexicon scope).
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)$/, v1Route(sessions.snapshot));
  // role-profile is a session read (S1b) — now on the sessions controller. v1 nests
  // it under the session resource (/sessions/:id/role-profile).
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/role-profile$/, v1Route(sessions.roleProfile));
  // role-lexicons (controller → service → repo). v1 uses the one error shape.
  router.add("GET", "/api/v1/role-lexicons", internalV1(roleLexicons.list));
  router.add("POST", "/api/v1/role-lexicons/term", internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.addTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/remove", internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.removeTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/hide", internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.hideTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/unhide", internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.unhideTerm(c);
  }));
  router.add("GET", "/api/v1/regression/run", internalV1(regression.run));
  // persona-runs — start a scripted full-engine run (paid; the click is the
  // go-ahead) + poll its progress. One at a time, enforced in the service.
  // On LIVE the start is blocked for everyone (blockOnLive): it spends OpenAI money
  // and writes test runs into the live database.
  router.add("POST", "/api/v1/persona-runs", internalV1(blockOnLive(
    "Test engine is off on the live site — run persona tests locally.",
    (c) => {
      if (!originOk(c.req)) throw forbidden("Bad origin");
      return personaRuns.start(c);
    },
  )));
  router.add("GET", "/api/v1/persona-runs/current", internalV1(personaRuns.current));
  // question is a session read (S1b) — now on the sessions controller. v1 nests it
  // under the session resource (/sessions/:id/question).
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/question$/, v1Route(sessions.question));
  // suggest-answers is an AI JSON read (S3) — now on the sessions controller (model
  // behind an injected boundary). v1 nests it under the session resource.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/suggest-answers$/, v1Route(sessions.suggestAnswers));
  // sessions non-AI writes (S2b) — now on the sessions controller. v1 nests each
  // under the session resource (/sessions/:id/…) with the one error shape + origin
  // guard.
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/answer$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.answer(c);
  }));
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/back$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.back(c);
  }));
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/notes$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.notes(c);
  }));
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/agenda\/cover$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.agendaCover(c);
  }));
  // Wrap-up exit — the warm early door routes through the reserved closer.
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/wrap-up$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.wrapUp(c);
  }));
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/verdict$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.verdict(c);
  }));
  // Promises loop phase 1 — the wrap-up confirm writes the agreed next actions.
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/promises$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.promises(c);
  }));
  // Promises loop phase 2 — card zero: read the prior run's open promises,
  // write the manager's taps back onto that run (or record a skip).
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/prior-promises$/, v1Route(sessions.priorPromises));
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/promise-outcomes$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.promiseOutcomes(c);
  }));
  // suggest-fix — the prompt-fix suggester (controller → service → repo + an
  // injected AI boundary; the one runs route that calls the model). v1 mirrors
  // today's path (runId stays in the body; the contract's id-in-path
  // /runs/:id/suggest-fix is deferred polish).
  router.add("POST", "/api/v1/suggest-fix", internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return suggestFix.suggest(c);
  }));
  // heartbeat — the "what does the app look like right now" snapshot the Guide
  // renders and diffs (page-heartbeat Phase 1). Reads the repo fresh per request.
  // v1-only: new endpoint, no legacy clients.
  router.add("GET", "/api/v1/heartbeat", internalV1(heartbeat.snapshot));

  // runs — finished-run history + Run Review (controller → service → repo). v1
  // mirrors today's paths under /api/v1/ (the contract's bare /:id and ?status=
  // merge are deferred REST polish). Mutating routes throw forbidden.
  // member's own runs (member-nav Phase 2) — logged-in members only (NOT admin), fenced
  // to the caller's userId. Registered before the admin runs routes so the literal /mine
  // isn't shadowed; plain v1Route (no adminV1). The admin runs endpoints below are unchanged.
  router.add("GET", "/api/v1/runs/mine", v1Route(runs.mine));
  // "1:1s about me" (people-roster Phase 5) — login required, any role; list-only rows
  // (type + date + manager), fenced + privacy-minimal in the service. Literal path, so
  // registered here with /mine before the /:id regex routes.
  router.add("GET", "/api/v1/runs/about-me", v1Route(runs.aboutMe));
  router.add("GET", /^\/api\/v1\/runs\/mine\/(?<id>[^/]+)$/, v1Route(runs.mineDetail));
  // Rate one of your own runs (pre-go-live PG3) — member-safe (org+user fenced in the
  // service), origin-guarded. Registered with the other /mine routes.
  router.add("POST", /^\/api\/v1\/runs\/mine\/(?<id>[^/]+)\/rating$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return runs.rateMine(c);
  }));
  // People roster (people-roster Phase 1) — a manager's formal list of their reports.
  // Manager/admin only (requireAdmin in the controller; members 403), fenced to the
  // caller's orgId + managerId in the service. Mutations origin-guarded like team/merge.
  router.add("GET", "/api/v1/team/people", v1Route(team.listPeople));
  router.add("POST", "/api/v1/team/people", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.createPerson(c);
  }));
  router.add("PATCH", /^\/api\/v1\/team\/people\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.updatePerson(c);
  }));
  // Hard delete — permanently wipes the person and every 1:1 about them (irreversible).
  router.add("DELETE", /^\/api\/v1\/team\/people\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.removePerson(c);
  }));
  // Person ↔ member-account link (people-roster Phase 5) — manager/admin only; the
  // target must be an account in the caller's own org (400 otherwise, in the service).
  router.add("GET", "/api/v1/team/linkable-users", v1Route(team.linkableUsers));
  router.add("POST", /^\/api\/v1\/team\/people\/(?<id>[^/]+)\/link$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.linkPerson(c);
  }));
  router.add("POST", /^\/api\/v1\/team\/people\/(?<id>[^/]+)\/unlink$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.unlinkPerson(c);
  }));
  // Org Members page (members-page Phase 1) — a normal admin's view of who can log in to
  // their OWN workspace (login accounts + pending invites). Manager/admin only (requireAdmin
  // in the controller; members 403), org-fenced. Distinct from the superadmin console, which
  // is cross-company. Read-only for now; invite + row actions arrive in later phases.
  router.add("GET", "/api/v1/members", v1Route(members.listMembers));
  router.add("POST", "/api/v1/members/invite", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return members.inviteMember(c);
  }));
  router.add("PATCH", /^\/api\/v1\/members\/(?<id>[^/]+)\/role$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return members.setMemberRole(c);
  }));
  router.add("POST", /^\/api\/v1\/members\/(?<id>[^/]+)\/deactivate$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return members.deactivateMember(c);
  }));
  router.add("POST", /^\/api\/v1\/members\/(?<id>[^/]+)\/reactivate$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return members.reactivateMember(c);
  }));
  router.add("DELETE", /^\/api\/v1\/members\/invitations\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return members.revokeMemberInvite(c);
  }));
  router.add("POST", /^\/api\/v1\/members\/invitations\/(?<id>[^/]+)\/resend$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return members.resendMemberInvite(c);
  }));
  // Guided sessions (monthly-checkin Phase 1) — the manager-walked "Monthly Check-in" 1:1.
  // Admins + managers (requireAdmin in the controller; members 403 — widened 2026-07-19),
  // fenced to the caller's org + manager + roster person. Own table — the interview pipeline
  // is untouched. Mutations origin-guarded like team/people.
  router.add("POST", "/api/v1/guided-sessions", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return guided.createGuidedSession(c);
  }));
  router.add("GET", "/api/v1/guided-sessions", v1Route(guided.listGuidedSessions));
  router.add("GET", /^\/api\/v1\/guided-sessions\/(?<id>[^/]+)$/, v1Route(guided.getGuidedSession));
  router.add("PATCH", /^\/api\/v1\/guided-sessions\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return guided.patchGuidedSession(c);
  }));
  router.add("POST", /^\/api\/v1\/guided-sessions\/(?<id>[^/]+)\/complete$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return guided.completeGuidedSession(c);
  }));
  // The ONE AI call (Phase 5) — drafts the Summary + private suggestions. Origin-guarded (it can
  // spend); cached in state unless ?regenerate=1.
  router.add("POST", /^\/api\/v1\/guided-sessions\/(?<id>[^/]+)\/wrapup-draft$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return guided.postWrapupDraft(c);
  }));
  // Trackers (monthly-checkin Phase 2) — promises/requests/goals per person, internal admin
  // only this phase (member lane is Phase 7). Person-fenced in the service; mutations origin-guarded.
  router.add("GET", /^\/api\/v1\/people\/(?<personId>[^/]+)\/tracker-items$/, v1Route(trackers.listTrackerItems));
  router.add("POST", /^\/api\/v1\/people\/(?<personId>[^/]+)\/tracker-items$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return trackers.createTrackerItem(c);
  }));
  router.add("PATCH", /^\/api\/v1\/tracker-items\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return trackers.updateTrackerItem(c);
  }));
  // Block scores (monthly-checkin Phase 3) — a person's six-block rating history for the
  // last-time marker. Written only via guided complete(); this is read-only + person-fenced.
  router.add("GET", /^\/api\/v1\/people\/(?<personId>[^/]+)\/block-scores$/, v1Route(guided.getBlockScores));
  // Member lane (monthly-checkin Phase 7) — a linked member's OWN requests + goals. requireAuth
  // (any role) in the controller; the service fences on people.user_id = caller AND kind ∈
  // {request, goal} — never promises, never another person, never guided_sessions. Origin-guarded.
  router.add("GET", "/api/v1/me/tracker-items", v1Route(trackers.listMyTrackerItems));
  router.add("POST", "/api/v1/me/requests", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return trackers.createMyRequest(c);
  }));
  router.add("PATCH", /^\/api\/v1\/me\/goals\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return trackers.updateMyGoal(c);
  }));
  // The join flow (member-onboarding-invites): a manager mints a one-time join link for a
  // roster person; preview + accept are PUBLIC (the invitee has no account yet) — the
  // token is the credential, single-use + expiring + stored hashed. Accept is origin-
  // guarded like every other mutation.
  router.add("POST", /^\/api\/v1\/team\/people\/(?<id>[^/]+)\/invite$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return invites.createInvite(c);
  }));
  router.add("GET", /^\/api\/v1\/invites\/(?<token>[^/]+)$/, v1Route(invites.previewInvite));
  router.add("POST", /^\/api\/v1\/invites\/(?<token>[^/]+)\/accept$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return invites.acceptInvite(c);
  }));
  router.add("GET", "/api/v1/runs/recent", v1Route(runs.recent));
  router.add("GET", "/api/v1/runs/finished", v1Route(runs.finished));
  // internal "prefill a run" (superadmin-guarded in the controller): list clonable finished
  // runs, and clone one into a fresh run owned by the caller. Literal paths registered
  // before the /:id regex routes so they aren't shadowed.
  router.add("GET", "/api/v1/runs/clonable", v1Route(runs.clonable));
  router.add("POST", "/api/v1/runs/clone", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return runs.clone(c);
  }));
  router.add("GET", /^\/api\/v1\/runs\/(?<id>[^/]+)\/full$/, v1Route(runs.full));
  router.add("GET", /^\/api\/v1\/runs\/(?<id>[^/]+)\/stages$/, v1Route(runs.stages));
  router.add("GET", /^\/api\/v1\/runs\/(?<id>[^/]+)\/overview$/, v1Route(runs.overview));
  router.add("DELETE", /^\/api\/v1\/runs\/(?<id>[^/]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return runs.del(c);
  }));
  router.add("POST", /^\/api\/v1\/runs\/(?<id>[^/]+)\/review$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return runs.review(c);
  }));
  router.add("POST", /^\/api\/v1\/runs\/(?<id>[^/]+)\/archive$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return runs.archive(c);
  }));
  // library serves files (not JSON), so it manages its own responses — no v1Route.
  router.add("GET", /^\/api\/v1\/library(?<rest>\/.*)?$/, internalRaw(library));
  // lexicon/candidates is an AI JSON read (S3) — now on the sessions controller
  // (the per-session lexicon reviewer, model behind an injected boundary). With this
  // the last route leaves handlers/lexicon.ts. v1 nests it under the session resource.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/lexicon\/candidates$/, v1Route(sessions.lexiconCandidates));
  // lexicon scope is a session read — now on the sessions controller (S1a). v1 nests
  // it under the session resource (/sessions/:id/lexicon/scope).
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/lexicon\/scope$/, v1Route(sessions.lexiconScope));
  // lexicon/decisions is a sessions non-AI write (S2b) — now on the sessions
  // controller. (candidates stays in handlers/lexicon.ts for S3, the AI route.)
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/lexicon\/decisions$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.lexiconDecisions(c);
  }));
  // lexicon promotion (controller → service → repo). v1 nounifies the collection
  // (/promotions — a free, shape-neutral rename). Per-session lexicon stays in
  // handlers/lexicon.ts.
  router.add("GET", "/api/v1/lexicon/promotions/pending", internalV1(lexiconPromote.pending));
  router.add("POST", "/api/v1/lexicon/promotions", internalV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return lexiconPromote.apply(c);
  }));
  // focus-points/stream is an SSE stream (S4) — now on the sessions controller.
  // It manages its own response, so NO v1Route (like library); v1 just nests the
  // path under the session resource. The shared stream-helper.ts stays in handlers/.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/focus-points\/stream$/, sessions.focusPointsStream);
  // focus-points/select is a sessions non-AI write (S2b) — now on the sessions
  // controller.
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/focus-points\/select$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.selectedFocus(c);
  }));
  // preparation/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/preparation\/stream$/, sessions.preparationStream);
  // bank/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/bank\/stream$/, sessions.bankStream);
  // plan/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/plan\/stream$/, sessions.planStream);
  // evaluation/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/evaluation\/stream$/, sessions.evaluationStream);
  // preview is a session read (S1b) — now on the sessions controller. v1 nests it
  // under the session resource (/sessions/:id/preview).
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/preview$/, v1Route(sessions.preview));
  // rules is a session read (questioning-panel "Rules" view) — same nesting as preview.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/rules$/, v1Route(sessions.rules));

  const staticHandler = IS_PROD ? createStaticHandler(CLIENT_DIST) : null;
  // The admin console ships under /admin (admin-live-deploy Phase 2), built with vite base
  // "/admin/". noindex keeps it out of search results; the prefix is stripped before file
  // resolution so /admin/assets/x.js -> admin/dist/assets/x.js and /admin(/) -> the index.
  const adminHandler = IS_PROD ? createStaticHandler(ADMIN_DIST, { prefix: "/admin", noindex: true }) : null;

  const server = http.createServer((req, res) => {
    router.handle(req, res, {
      fallback: (req, res, url) => {
        // An unmatched /api/* path answers in the one JSON error shape the rest of the API
        // uses — never plain text or (in prod) the SPA index (F-001).
        if (url.pathname.startsWith("/api/")) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            error: { code: "NOT_FOUND", message: `Unknown API route: ${req.method} ${url.pathname}` },
          }));
        }
        // Admin console under /admin -> the admin dist (its own SPA fallback). Checked
        // before the customer handler so admin deep links resolve to the admin index.
        // (/api/v1/admin/* is already handled above via the /api/ guard + matched routes.)
        if (IS_PROD && adminHandler && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))) {
          return adminHandler(req, res, url);
        }
        if (IS_PROD && staticHandler) return staticHandler(req, res, url);
        if (IS_PROD) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          return res.end("Not found");
        }
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("API only. Visit http://localhost:3000 for the app (Vite dev server).");
      },
    });
  });

  server.keepAliveTimeout = 75_000;
  server.headersTimeout = 80_000;

  // A failed bind (almost always the port is still held by a zombie API from a
  // previous run) must be LOUD and FATAL — otherwise it falls through to the
  // catch-all uncaughtException handler below, which keeps a not-listening process
  // alive so `npm run dev` looks healthy while every /api call 500s.
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  \x1b[1;31mPort ${PORT} is already in use\x1b[0m — likely a leftover API from a previous run.`);
      console.error(`  Free it and retry:  npx kill-port ${PORT}\n`);
    } else {
      console.error("[server error]", err);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    const mode = IS_PROD ? "prod" : "dev";
    console.log();
    console.log(`  \x1b[1;36mSero API\x1b[0m \x1b[2m(${mode})\x1b[0m`);
    console.log(`  listening on http://localhost:${PORT}`);
    if (!IS_PROD) console.log(`  frontend:     http://localhost:3000  (vite)`);
    console.log();
  });

  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] graceful shutdown (5s) ...`);
    // Drain queued run-artifact + question + session-mirror writes before exit
    // so nothing in flight is lost.
    void flushArtifactWrites();
    void flushQuestionWrites();
    void flushArcOverlayWrites();
    void flushRoleProfileWrites();
    void flushTraceWrites();
    void flushSessionWrites();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref?.();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Keep the long-lived server alive on stray errors instead of crashing the process.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

// A failed boot (migration error, unreachable DB) must be LOUD and FATAL — the
// uncaughtException handler above is for the running server, not for startup.
main().catch((e) => {
  console.error("[boot] failed to start:", e instanceof Error ? e.message : e);
  process.exit(1);
});
