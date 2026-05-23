const http = require("node:http");
const path = require("node:path");

const { loadEnv } = require("../../src/env");
loadEnv();

const { createRouter } = require("./router");
const { createStaticHandler } = require("./static");
const { startSweep } = require("./sessions");

const meetingTypes = require("./handlers/meeting-types");
const start = require("./handlers/start");
const question = require("./handlers/question");
const answer = require("./handlers/answer");
const focusPoints = require("./handlers/focus-points");
const preparation = require("./handlers/preparation");
const bank = require("./handlers/bank");
const plan = require("./handlers/plan");
const evaluation = require("./handlers/evaluation");
const rehydrate = require("./handlers/rehydrate");
const notes = require("./handlers/notes");
const runs = require("./handlers/runs");
const lexicon = require("./handlers/lexicon");

const IS_PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.API_PORT || process.env.PORT || (IS_PROD ? 3000 : 3001));
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

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
  router.add("POST", "/api/start", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    if (rateLimitIp(c.req)) return c.error(Object.assign(new Error("Rate limit exceeded"), { status: 429 }));
    return start(c);
  });
  router.add("GET", "/api/session", rehydrate);
  router.add("GET", "/api/question", question);
  router.add("POST", "/api/answer", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return answer(c);
  });
  router.add("POST", "/api/notes", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return notes(c);
  });
  router.add("GET", "/api/runs/recent", runs.recent);
  router.add("GET", /^\/api\/runs\/(?<id>[^/]+)\/overview$/, runs.overview);
  router.add("DELETE", /^\/api\/runs\/(?<id>[^/]+)$/, (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return runs.del(c);
  });
  router.add("GET", "/api/lexicon/candidates", lexicon.candidates);
  router.add("POST", "/api/lexicon/decisions", (c) => {
    if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
    return lexicon.decisions(c);
  });
  router.add("GET", "/api/focus-points/stream", focusPoints);
  router.add("GET", "/api/preparation/stream", preparation);
  router.add("GET", "/api/bank/stream", bank);
  router.add("GET", "/api/plan/stream", plan);
  router.add("GET", "/api/evaluation/stream", evaluation);

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

main();
