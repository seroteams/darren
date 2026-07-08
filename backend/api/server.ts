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
import { runEnvironmentGuard, EnvGuardError } from "../db/env-guard.ts";

import * as arcs from "./services/arcs/arcs.controller.ts";
import * as auth from "./services/auth/auth.controller.ts";
import * as catalog from "./services/catalog/catalog.controller.ts";
import { v1Route } from "./middleware/v1-route.ts";
import { requireAdminRoute } from "./middleware/admin-guard.ts";
import { requireSuperadminRoute } from "./middleware/superadmin-guard.ts";
import { forbidden, rateLimited } from "./middleware/http-error.ts";
import * as sessions from "./services/sessions/sessions.controller.ts";
import * as runs from "./services/runs/runs.controller.ts";
import * as team from "./services/team/team.controller.ts";
import * as invites from "./services/invites/invites.controller.ts";
import * as pipeline from "./services/pipeline/pipeline.controller.ts";
import * as lexiconPromote from "./services/lexicon/lexicon.controller.ts";
import * as roleLexicons from "./services/role-lexicons/role-lexicons.controller.ts";
import * as regression from "./services/regression/regression.controller.ts";
import * as personaRuns from "./services/persona-runs/persona-runs.controller.ts";
import * as suggestFix from "./services/suggest-fix/suggest-fix.controller.ts";
import library from "./services/library/library.controller.ts";
import checks from "./services/checks/checks.controller.ts";
import * as feedback from "./services/feedback/feedback.controller.ts";
import * as superadmin from "./services/superadmin/superadmin.controller.ts";
import * as heartbeat from "./services/heartbeat/heartbeat.controller.ts";
import * as errorLog from "./services/error-log/error-log.controller.ts";

const IS_PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.API_PORT || process.env.PORT || (IS_PROD ? 3000 : 3001));
const CLIENT_DIST = path.join(ROOT, "admin", "dist");

// Simple per-IP rate limiter for session creation (POST /api/start).
// Allows up to MAX_PER_IP new sessions within WINDOW_MS before returning 429.
const RATE_WINDOW_MS = 60_000;
const MAX_PER_IP = 5;
const ipCounts = new Map<string, number>();
setInterval(() => ipCounts.clear(), RATE_WINDOW_MS).unref?.();

function rateLimitIp(req: IncomingMessage): boolean {
  const xff = req.headers["x-forwarded-for"];
  const fromXff = typeof xff === "string" ? xff.split(",")[0]?.trim() : undefined;
  const ip = fromXff || req.socket?.remoteAddress || "unknown";
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
  const xff = req.headers["x-forwarded-for"];
  const fromXff = typeof xff === "string" ? xff.split(",")[0]?.trim() : undefined;
  const ip = fromXff || req.socket?.remoteAddress || "unknown";
  const count = (errorReportCounts.get(ip) || 0) + 1;
  errorReportCounts.set(ip, count);
  return count > MAX_ERROR_REPORTS_PER_IP;
}

function warnIfNoKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("\x1b[33m[warn] OPENAI_API_KEY not set — AI stages will fail on first call.\x1b[0m");
    console.warn("       bash:       export OPENAI_API_KEY=sk-...");
    console.warn("       PowerShell: $env:OPENAI_API_KEY='sk-...'");
  }
}

function originOk(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

// Admin tooling requires a logged-in owner/admin (admin-access-guard Phase 2). adminV1
// keeps the one v1 error shape; adminRaw wraps the library stream, which manages its
// own response. (Runs endpoints gate themselves in the controller via requireAdmin.)
const adminV1 = (h: RouteHandler): RouteHandler => v1Route(requireAdminRoute(h));
const adminRaw = (h: RouteHandler): RouteHandler => requireAdminRoute(h);

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

  startSweep();

  const router = createRouter();

  // version — the running API's build id (git short SHA + commit date), captured
  // at boot. Lets the app show which build is live so a stale server is obvious.
  router.add("GET", "/api/version", (c) => c.json(200, getBuildInfo()));

  // auth — register + login (Phase 006). v1-only (no legacy alias): new endpoints,
  // the one error shape from the start.
  router.add("POST", "/api/v1/auth/register", v1Route(auth.register));
  router.add("POST", "/api/v1/auth/login", v1Route(auth.login));
  router.add("POST", "/api/v1/auth/logout", v1Route(auth.logout));
  router.add("GET", "/api/v1/auth/me", v1Route(auth.me));

  // feedback — a tester's in-app note (Phase 5; feedback-inbox moved the store to the
  // feedback_notes table). Login required (any role, not admin); no external service.
  // Origin-guarded like the other mutating v1 routes.
  router.add("POST", "/api/v1/feedback", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return feedback.submit(c);
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
  router.add("GET", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)\/runs$/, superadminV1(superadmin.userRuns));
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
  router.add("GET", "/api/v1/arcs", adminV1(arcs.list));
  router.add("POST", /^\/api\/v1\/arcs\/(?<slug>[a-z0-9_]+)\/reset$/, adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return arcs.reset(c);
  }));
  router.add("POST", /^\/api\/v1\/arcs\/(?<slug>[a-z0-9_]+)$/, adminV1((c) => {
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
  router.add("GET", "/api/v1/role-lexicons", adminV1(roleLexicons.list));
  router.add("POST", "/api/v1/role-lexicons/term", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.addTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/remove", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.removeTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/hide", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.hideTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/unhide", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.unhideTerm(c);
  }));
  router.add("GET", "/api/v1/regression/run", adminV1(regression.run));
  // persona-runs — start a scripted full-engine run (paid; the click is the
  // go-ahead) + poll its progress. One at a time, enforced in the service.
  router.add("POST", "/api/v1/persona-runs", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return personaRuns.start(c);
  }));
  router.add("GET", "/api/v1/persona-runs/current", adminV1(personaRuns.current));
  router.add("POST", "/api/v1/checks/run", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return checks(c);
  }));
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
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/verdict$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.verdict(c);
  }));
  // suggest-fix — the prompt-fix suggester (controller → service → repo + an
  // injected AI boundary; the one runs route that calls the model). v1 mirrors
  // today's path (runId stays in the body; the contract's id-in-path
  // /runs/:id/suggest-fix is deferred polish).
  router.add("POST", "/api/v1/suggest-fix", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return suggestFix.suggest(c);
  }));
  // heartbeat — the "what does the app look like right now" snapshot the Guide
  // renders and diffs (page-heartbeat Phase 1). Reads the repo fresh per request.
  // v1-only: new endpoint, no legacy clients.
  router.add("GET", "/api/v1/heartbeat", adminV1(heartbeat.snapshot));

  router.add("GET", "/api/v1/pipeline/status", adminV1(pipeline.status));
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
  // Team people-aliases (pre-go-live PG9) — a manager merges/renames people in their OWN
  // auto-built Team. Member-safe (login required, fenced to the caller's userId in the
  // controller); the two mutations are origin-guarded like rateMine.
  router.add("GET", "/api/v1/team/aliases", v1Route(team.aliases));
  router.add("POST", "/api/v1/team/merge", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.merge(c);
  }));
  router.add("POST", "/api/v1/team/rename", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.rename(c);
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
  router.add("POST", /^\/api\/v1\/team\/people\/(?<id>[^/]+)\/merge$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.mergePerson(c);
  }));
  router.add("POST", /^\/api\/v1\/team\/people\/(?<id>[^/]+)\/archive$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return team.archivePerson(c);
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
  // dev-only "prefill a run" (admin-guarded in the controller): list clonable finished
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
  router.add("GET", /^\/api\/v1\/library(?<rest>\/.*)?$/, adminRaw(library));
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
  router.add("GET", "/api/v1/lexicon/promotions/pending", adminV1(lexiconPromote.pending));
  router.add("POST", "/api/v1/lexicon/promotions", adminV1((c) => {
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
