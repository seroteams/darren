const http = require("node:http");
const path = require("node:path");

const { loadEnv } = require("../engine/env");
loadEnv();

const { createRouter } = require("./router");
const { createStaticHandler } = require("./static");
const { startSweep } = require("./sessions");

const meetingTypes = require("./handlers/meeting-types");
const arcs = require("./handlers/arcs");
const personaBench = require("./handlers/persona-bench");
const start = require("./handlers/start");
const question = require("./handlers/question");
const suggestAnswers = require("./handlers/suggest-answers");
const answer = require("./handlers/answer");
const back = require("./handlers/back");
const focusPoints = require("./handlers/focus-points");
const selectedFocus = require("./handlers/selected-focus");
const preparation = require("./handlers/preparation");
const bank = require("./handlers/bank");
const plan = require("./handlers/plan");
const evaluation = require("./handlers/evaluation");
const preview = require("./handlers/preview");
const rehydrate = require("./handlers/rehydrate");
const notes = require("./handlers/notes");
const agendaCover = require("./handlers/agenda");
const runs = require("./handlers/runs");
const runReview = require("./handlers/review");
const pipeline = require("./handlers/pipeline");
const lexicon = require("./handlers/lexicon");
const roleProfile = require("./handlers/role-profile");
const roleLexicons = require("./handlers/role-lexicons");
const regression = require("./handlers/regression");
const verdict = require("./handlers/verdict");
const suggestFix = require("./handlers/suggest-fix");
const library = require("./handlers/library");

const IS_PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.API_PORT || process.env.PORT || (IS_PROD ? 3000 : 3001));
const CLIENT_DIST = path.join(__dirname, "..", "..", "frontend", "client", "dist");

// Simple per-IP rate limiter for session creation (POST /api/start).
// Allows up to MAX_PER_IP new sessions within WINDOW_MS before returning 429.
const RATE_WINDOW_MS = 60_000;
const MAX_PER_IP = 5;
const ipCounts = new Map();
setInterval(() => ipCounts.clear(), RATE_WINDOW_MS).unref?.();

function rateLimitIp(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const count = (ipCounts.get(ip) || 0) + 1;
  ipCounts.set(ip, count);
  return count > MAX_PER_IP;
}

function warnIfNoKey() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("\x1b[33m[warn] OPENAI_API_KEY not set — AI stages will fail on first call.\x1b[0m");
    console.warn("       bash:       export OPENAI_API_KEY=sk-...");
    console.warn("       PowerShell: $env:OPENAI_API_KEY='sk-...'");
  }
}

function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function main() {
  warnIfNoKey();
  startSweep();

  const router = createRouter();

  router.add("GET", "/api/meeting-types", meetingTypes);
  router.add("GET", "/api/arcs", arcs.list);
  router.add("POST", /^\/api\/arcs\/(?<slug>[a-z0-9_]+)\/reset$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return arcs.reset(c);
  });
  router.add("POST", /^\/api\/arcs\/(?<slug>[a-z0-9_]+)$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return arcs.save(c);
  });
  router.add("GET", "/api/persona-bench", personaBench);
  router.add("POST", "/api/start", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    if (rateLimitIp(c.req)) return c.error(Object.assign(new Error("Rate limit exceeded"), { status: 429 }));
    return start(c);
  });
  router.add("GET", "/api/session", rehydrate);
  router.add("GET", "/api/role-profile", roleProfile);
  router.add("GET", "/api/role-lexicons", roleLexicons.list);
  router.add("POST", "/api/role-lexicons/term", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.addTerm(c);
  });
  router.add("POST", "/api/role-lexicons/term/remove", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return roleLexicons.removeTerm(c);
  });
  router.add("GET", "/api/regression/run", regression.run);
  router.add("GET", "/api/question", question);
  router.add("GET", "/api/suggest-answers", suggestAnswers);
  router.add("POST", "/api/answer", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return answer(c);
  });
  router.add("POST", "/api/back", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return back(c);
  });
  router.add("POST", "/api/notes", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return notes(c);
  });
  router.add("POST", "/api/agenda/cover", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return agendaCover(c);
  });
  router.add("POST", "/api/verdict", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return verdict(c);
  });
  router.add("POST", "/api/suggest-fix", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return suggestFix(c);
  });
  router.add("GET", "/api/pipeline/status", pipeline.status);
  router.add("GET", "/api/pipeline/manifest", pipeline.manifest);
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
    return runReview.review(c);
  });
  router.add("POST", /^\/api\/runs\/(?<id>[^/]+)\/archive$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return runs.archive(c);
  });
  router.add("GET", /^\/api\/library(?<rest>\/.*)?$/, library);
  router.add("GET", "/api/lexicon/candidates", lexicon.candidates);
  router.add("GET", "/api/lexicon/scope", lexicon.scope);
  router.add("POST", "/api/lexicon/decisions", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return lexicon.decisions(c);
  });
  router.add("GET", "/api/lexicon/promote/pending", lexicon.promotePending);
  router.add("POST", "/api/lexicon/promote", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return lexicon.promoteApply(c);
  });
  router.add("GET", "/api/focus-points/stream", focusPoints);
  router.add("POST", "/api/focus-points/select", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return selectedFocus(c);
  });
  router.add("GET", "/api/preparation/stream", preparation);
  router.add("GET", "/api/bank/stream", bank);
  router.add("GET", "/api/plan/stream", plan);
  router.add("GET", "/api/evaluation/stream", evaluation);
  router.add("GET", "/api/preview", preview);

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

  const shutdown = (signal) => {
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
