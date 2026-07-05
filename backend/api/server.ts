import "./env-boot.ts"; // MUST be first — loads .env before any module reads env at load time

import http from "node:http";
import path from "node:path";
import type { IncomingMessage } from "node:http";

import { ROOT } from "../engine/paths.mts";
import { createRouter, type RouteHandler } from "./router.ts";
import { createStaticHandler } from "./static.ts";
import { startSweep } from "./sessions.ts";
import { getBuildInfo } from "./build-info.ts";

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
import * as pipeline from "./services/pipeline/pipeline.controller.ts";
import * as lexiconPromote from "./services/lexicon/lexicon.controller.ts";
import * as roleLexicons from "./services/role-lexicons/role-lexicons.controller.ts";
import * as regression from "./services/regression/regression.controller.ts";
import * as suggestFix from "./services/suggest-fix/suggest-fix.controller.ts";
import library from "./services/library/library.controller.ts";
import checks from "./services/checks/checks.controller.ts";
import * as feedback from "./services/feedback/feedback.controller.ts";
import * as superadmin from "./services/superadmin/superadmin.controller.ts";

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
// keeps the one v1 error shape; adminLegacy wraps the bare /api aliases + the library
// stream. (Runs endpoints gate themselves in the controller via requireAdmin.)
const adminV1 = (h: RouteHandler): RouteHandler => v1Route(requireAdminRoute(h));
const adminLegacy = (h: RouteHandler): RouteHandler => requireAdminRoute(h);

// Superadmin tooling (pre-go-live PG6) — cross-company, gated to the SUPERADMIN_EMAILS
// allowlist. Every /api/v1/admin/* route funnels through requireSuperadminRoute, so a route
// can't be added here un-gated, and every access (read or write) is audited. Reads only until
// user-management Phase 2 added the first mutation (PATCH role); mutations are origin-guarded
// too. The per-company fence for every other path is untouched.
const superadminV1 = (h: RouteHandler): RouteHandler => v1Route(requireSuperadminRoute(h));

function main(): void {
  warnIfNoKey();
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

  // feedback — a tester's in-app note (Phase 5). Login required (any role, not admin);
  // stored to a local file (content/data/feedback/feedback.jsonl), no external service.
  // Origin-guarded like the other mutating v1 routes.
  router.add("POST", "/api/v1/feedback", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return feedback.submit(c);
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

  // catalog — first domain on the v1 layer (controller → service → repo).
  // v1 routes use the one error shape (v1Route); the legacy /api/ paths stay as
  // aliases on the same controller with the old error shape (decision D1/D2).
  router.add("GET", "/api/v1/meeting-types", v1Route(catalog.getMeetingTypes));
  router.add("GET", "/api/v1/personas", v1Route(catalog.getPersonas));
  router.add("GET", "/api/meeting-types", catalog.getMeetingTypes);
  router.add("GET", "/api/persona-bench", catalog.getPersonas);
  // arcs (controller → service → repo). v1 uses the one error shape and throws
  // forbidden on bad origin; the legacy /api/ aliases keep the old shape (D1/D2).
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
  router.add("GET", "/api/arcs", adminLegacy(arcs.list));
  router.add("POST", /^\/api\/arcs\/(?<slug>[a-z0-9_]+)\/reset$/, adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return arcs.reset(c);
  }));
  router.add("POST", /^\/api\/arcs\/(?<slug>[a-z0-9_]+)$/, adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return arcs.save(c);
  }));
  // start — create a session (controller → service → repo + S0 seam; the AI
  // pre-warm is injected). The origin guard + per-IP rate limit are HTTP concerns,
  // so they stay here in front of both routes. v1 creates on the collection
  // (POST /api/v1/sessions, decision D4) with the one error shape; legacy
  // /api/start keeps the old flat error shape so the admin is unaffected.
  router.add("POST", "/api/v1/sessions", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    if (rateLimitIp(c.req)) throw rateLimited("Rate limit exceeded");
    return sessions.start(c);
  }));
  router.add("POST", "/api/start", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    if (rateLimitIp(c.req)) return c.error(Object.assign(new Error("Rate limit exceeded"), { status: 429 }));
    return sessions.start(c);
  });
  // sessions — the live 1:1 runner (controller → service → repo, the S0 seam). v1
  // takes the id IN THE PATH (/api/v1/sessions/:id…, decision D4) with the one error
  // shape; legacy /api/ keeps ?s=<id> so the admin is unaffected. S1a: the two pure
  // session-state reads (snapshot + lexicon scope); the rest follow per sub-pass.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)$/, v1Route(sessions.snapshot));
  router.add("GET", "/api/session", sessions.snapshot);
  // role-profile is a session read (S1b) — now on the sessions controller. v1 nests
  // it under the session resource (/sessions/:id/role-profile); legacy ?s= unchanged.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/role-profile$/, v1Route(sessions.roleProfile));
  router.add("GET", "/api/role-profile", sessions.roleProfile);
  // role-lexicons (controller → service → repo). v1 uses the one error shape;
  // legacy /api/ paths are aliases on the same controller (D1/D2).
  router.add("GET", "/api/v1/role-lexicons", adminV1(roleLexicons.list));
  router.add("GET", "/api/role-lexicons", adminLegacy(roleLexicons.list));
  router.add("POST", "/api/v1/role-lexicons/term", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.addTerm(c);
  }));
  router.add("POST", "/api/role-lexicons/term", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.addTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/remove", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.removeTerm(c);
  }));
  router.add("POST", "/api/role-lexicons/term/remove", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.removeTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/hide", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.hideTerm(c);
  }));
  router.add("POST", "/api/role-lexicons/term/hide", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.hideTerm(c);
  }));
  router.add("POST", "/api/v1/role-lexicons/term/unhide", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.unhideTerm(c);
  }));
  router.add("POST", "/api/role-lexicons/term/unhide", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.unhideTerm(c);
  }));
  router.add("GET", "/api/v1/regression/run", adminV1(regression.run));
  router.add("GET", "/api/regression/run", adminLegacy(regression.run));
  router.add("POST", "/api/v1/checks/run", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return checks(c);
  }));
  router.add("POST", "/api/checks/run", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return checks(c);
  }));
  // question is a session read (S1b) — now on the sessions controller. v1 nests it
  // under the session resource (/sessions/:id/question); legacy ?s= unchanged.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/question$/, v1Route(sessions.question));
  router.add("GET", "/api/question", sessions.question);
  // suggest-answers is an AI JSON read (S3) — now on the sessions controller (model
  // behind an injected boundary). v1 nests it under the session resource.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/suggest-answers$/, v1Route(sessions.suggestAnswers));
  router.add("GET", "/api/suggest-answers", sessions.suggestAnswers);
  // sessions non-AI writes (S2b) — now on the sessions controller. v1 nests each
  // under the session resource (/sessions/:id/…) with the one error shape + origin
  // guard; legacy /api/ keeps body.sessionId + the old flat shape (admin unaffected).
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/answer$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.answer(c);
  }));
  router.add("POST", "/api/answer", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.answer(c);
  });
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/back$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.back(c);
  }));
  router.add("POST", "/api/back", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.back(c);
  });
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/notes$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.notes(c);
  }));
  router.add("POST", "/api/notes", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.notes(c);
  });
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/agenda\/cover$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.agendaCover(c);
  }));
  router.add("POST", "/api/agenda/cover", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.agendaCover(c);
  });
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/verdict$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.verdict(c);
  }));
  router.add("POST", "/api/verdict", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.verdict(c);
  });
  // suggest-fix — the prompt-fix suggester (controller → service → repo + an
  // injected AI boundary; the one runs route that calls the model). v1 mirrors
  // today's path (runId stays in the body; the contract's id-in-path
  // /runs/:id/suggest-fix is deferred polish); legacy alias on the same controller.
  router.add("POST", "/api/v1/suggest-fix", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return suggestFix.suggest(c);
  }));
  router.add("POST", "/api/suggest-fix", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return suggestFix.suggest(c);
  }));
  router.add("GET", "/api/v1/pipeline/status", adminV1(pipeline.status));
  router.add("GET", "/api/pipeline/status", adminLegacy(pipeline.status));
  router.add("GET", "/api/v1/pipeline/manifest", adminV1(pipeline.manifest));
  router.add("GET", "/api/pipeline/manifest", adminLegacy(pipeline.manifest));
  // runs — finished-run history + Run Review (controller → service → repo). v1
  // mirrors today's paths under /api/v1/ (the contract's bare /:id and ?status=
  // merge are deferred REST polish); legacy /api/runs/* stay as aliases on the
  // same controller. Mutating routes throw forbidden on v1, c.error on legacy.
  // member's own runs (member-nav Phase 2) — logged-in members only (NOT admin), fenced
  // to the caller's userId. Registered before the admin runs routes so the literal /mine
  // isn't shadowed; plain v1Route (no adminV1). The admin runs endpoints below are unchanged.
  router.add("GET", "/api/v1/runs/mine", v1Route(runs.mine));
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
  router.add("GET", "/api/runs/recent", runs.recent);
  router.add("GET", "/api/runs/finished", runs.finished);
  router.add("GET", /^\/api\/runs\/(?<id>[^/]+)\/full$/, runs.full);
  router.add("GET", /^\/api\/runs\/(?<id>[^/]+)\/stages$/, runs.stages);
  router.add("GET", /^\/api\/runs\/(?<id>[^/]+)\/overview$/, runs.overview);
  router.add("DELETE", /^\/api\/runs\/(?<id>[^/]+)$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return runs.del(c);
  });
  router.add("POST", /^\/api\/runs\/(?<id>[^/]+)\/review$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return runs.review(c);
  });
  router.add("POST", /^\/api\/runs\/(?<id>[^/]+)\/archive$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return runs.archive(c);
  });
  // library serves files (not JSON), so it manages its own responses — no v1Route.
  router.add("GET", /^\/api\/v1\/library(?<rest>\/.*)?$/, adminLegacy(library));
  router.add("GET", /^\/api\/library(?<rest>\/.*)?$/, adminLegacy(library));
  // lexicon/candidates is an AI JSON read (S3) — now on the sessions controller
  // (the per-session lexicon reviewer, model behind an injected boundary). With this
  // the last route leaves handlers/lexicon.ts. v1 nests it under the session resource.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/lexicon\/candidates$/, v1Route(sessions.lexiconCandidates));
  router.add("GET", "/api/lexicon/candidates", sessions.lexiconCandidates);
  // lexicon scope is a session read — now on the sessions controller (S1a). v1 nests
  // it under the session resource (/sessions/:id/lexicon/scope); legacy path unchanged.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/lexicon\/scope$/, v1Route(sessions.lexiconScope));
  router.add("GET", "/api/lexicon/scope", sessions.lexiconScope);
  // lexicon/decisions is a sessions non-AI write (S2b) — now on the sessions
  // controller. (candidates stays in handlers/lexicon.ts for S3, the AI route.)
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/lexicon\/decisions$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.lexiconDecisions(c);
  }));
  router.add("POST", "/api/lexicon/decisions", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.lexiconDecisions(c);
  });
  // lexicon promotion (controller → service → repo). v1 nounifies the collection
  // (/promotions — a free, shape-neutral rename); legacy /promote stays as an alias
  // on the same controller (D1/D2). Per-session lexicon stays in handlers/lexicon.ts.
  router.add("GET", "/api/v1/lexicon/promotions/pending", adminV1(lexiconPromote.pending));
  router.add("POST", "/api/v1/lexicon/promotions", adminV1((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return lexiconPromote.apply(c);
  }));
  router.add("GET", "/api/lexicon/promote/pending", adminLegacy(lexiconPromote.pending));
  router.add("POST", "/api/lexicon/promote", adminLegacy((c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return lexiconPromote.apply(c);
  }));
  // focus-points/stream is an SSE stream (S4) — now on the sessions controller.
  // It manages its own response, so NO v1Route (like library); v1 just nests the
  // path under the session resource. The shared stream-helper.ts stays in handlers/.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/focus-points\/stream$/, sessions.focusPointsStream);
  router.add("GET", "/api/focus-points/stream", sessions.focusPointsStream);
  // focus-points/select is a sessions non-AI write (S2b) — now on the sessions
  // controller.
  router.add("POST", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/focus-points\/select$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return sessions.selectedFocus(c);
  }));
  router.add("POST", "/api/focus-points/select", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return sessions.selectedFocus(c);
  });
  // preparation/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/preparation\/stream$/, sessions.preparationStream);
  router.add("GET", "/api/preparation/stream", sessions.preparationStream);
  // bank/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/bank\/stream$/, sessions.bankStream);
  router.add("GET", "/api/bank/stream", sessions.bankStream);
  // plan/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/plan\/stream$/, sessions.planStream);
  router.add("GET", "/api/plan/stream", sessions.planStream);
  // evaluation/stream is an SSE stream (S4) — now on the sessions controller. Like
  // focus-points it manages its own response, so NO v1Route; v1 just nests the path.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/evaluation\/stream$/, sessions.evaluationStream);
  router.add("GET", "/api/evaluation/stream", sessions.evaluationStream);
  // preview is a session read (S1b) — now on the sessions controller. v1 nests it
  // under the session resource (/sessions/:id/preview); legacy ?s=&stage= unchanged.
  router.add("GET", /^\/api\/v1\/sessions\/(?<id>[^/]+)\/preview$/, v1Route(sessions.preview));
  router.add("GET", "/api/preview", sessions.preview);

  const staticHandler = IS_PROD ? createStaticHandler(CLIENT_DIST) : null;

  const server = http.createServer((req, res) => {
    router.handle(req, res, {
      fallback: (req, res, url) => {
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

main();
