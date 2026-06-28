import http from "node:http";
import path from "node:path";
import type { IncomingMessage } from "node:http";

import { loadEnv } from "../engine/env.ts";
import { ROOT } from "../engine/paths.mts";
import { createRouter } from "./router.ts";
import { createStaticHandler } from "./static.ts";
import { startSweep } from "./sessions.ts";

import * as arcs from "./services/arcs/arcs.controller.ts";
import * as catalog from "./services/catalog/catalog.controller.ts";
import { v1Route } from "./middleware/v1-route.ts";
import { forbidden, rateLimited } from "./middleware/http-error.ts";
import bank from "./handlers/bank.ts";
import plan from "./handlers/plan.ts";
import evaluation from "./handlers/evaluation.ts";
import * as sessions from "./services/sessions/sessions.controller.ts";
import * as runs from "./services/runs/runs.controller.ts";
import * as pipeline from "./services/pipeline/pipeline.controller.ts";
import * as lexiconPromote from "./services/lexicon/lexicon.controller.ts";
import * as roleLexicons from "./services/role-lexicons/role-lexicons.controller.ts";
import * as regression from "./services/regression/regression.controller.ts";
import * as suggestFix from "./services/suggest-fix/suggest-fix.controller.ts";
import library from "./services/library/library.controller.ts";
import checks from "./services/checks/checks.controller.ts";

// Loaded before main() (and therefore before any request) so the AI key/model —
// read at call time inside ai-client/models — are present. The handler modules
// above evaluate first; none read the AI env at load time.
loadEnv();

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

function main(): void {
  warnIfNoKey();
  startSweep();

  const router = createRouter();

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
  router.add("GET", "/api/v1/arcs", v1Route(arcs.list));
  router.add("POST", /^\/api\/v1\/arcs\/(?<slug>[a-z0-9_]+)\/reset$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return arcs.reset(c);
  }));
  router.add("POST", /^\/api\/v1\/arcs\/(?<slug>[a-z0-9_]+)$/, v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return arcs.save(c);
  }));
  router.add("GET", "/api/arcs", arcs.list);
  router.add("POST", /^\/api\/arcs\/(?<slug>[a-z0-9_]+)\/reset$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return arcs.reset(c);
  });
  router.add("POST", /^\/api\/arcs\/(?<slug>[a-z0-9_]+)$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return arcs.save(c);
  });
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
  router.add("GET", "/api/v1/role-lexicons", v1Route(roleLexicons.list));
  router.add("GET", "/api/role-lexicons", roleLexicons.list);
  router.add("POST", "/api/v1/role-lexicons/term", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.addTerm(c);
  }));
  router.add("POST", "/api/role-lexicons/term", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.addTerm(c);
  });
  router.add("POST", "/api/v1/role-lexicons/term/remove", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return roleLexicons.removeTerm(c);
  }));
  router.add("POST", "/api/role-lexicons/term/remove", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.removeTerm(c);
  });
  router.add("GET", "/api/v1/regression/run", v1Route(regression.run));
  router.add("GET", "/api/regression/run", regression.run);
  router.add("POST", "/api/v1/checks/run", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return checks(c);
  }));
  router.add("POST", "/api/checks/run", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return checks(c);
  });
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
  router.add("POST", "/api/v1/suggest-fix", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return suggestFix.suggest(c);
  }));
  router.add("POST", "/api/suggest-fix", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return suggestFix.suggest(c);
  });
  router.add("GET", "/api/v1/pipeline/status", v1Route(pipeline.status));
  router.add("GET", "/api/pipeline/status", pipeline.status);
  router.add("GET", "/api/v1/pipeline/manifest", v1Route(pipeline.manifest));
  router.add("GET", "/api/pipeline/manifest", pipeline.manifest);
  // runs — finished-run history + Run Review (controller → service → repo). v1
  // mirrors today's paths under /api/v1/ (the contract's bare /:id and ?status=
  // merge are deferred REST polish); legacy /api/runs/* stay as aliases on the
  // same controller. Mutating routes throw forbidden on v1, c.error on legacy.
  router.add("GET", "/api/v1/runs/recent", v1Route(runs.recent));
  router.add("GET", "/api/v1/runs/finished", v1Route(runs.finished));
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
  router.add("GET", /^\/api\/v1\/library(?<rest>\/.*)?$/, library);
  router.add("GET", /^\/api\/library(?<rest>\/.*)?$/, library);
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
  router.add("GET", "/api/v1/lexicon/promotions/pending", v1Route(lexiconPromote.pending));
  router.add("POST", "/api/v1/lexicon/promotions", v1Route((c) => {
    if (!originOk(c.req)) throw forbidden("Bad origin");
    return lexiconPromote.apply(c);
  }));
  router.add("GET", "/api/lexicon/promote/pending", lexiconPromote.pending);
  router.add("POST", "/api/lexicon/promote", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return lexiconPromote.apply(c);
  });
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
  router.add("GET", "/api/bank/stream", bank);
  router.add("GET", "/api/plan/stream", plan);
  router.add("GET", "/api/evaluation/stream", evaluation);
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
