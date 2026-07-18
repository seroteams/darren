#!/usr/bin/env node
// frontend-admin-split Phase 4 — the serve + fence proof, in two halves:
//
//   1. BUNDLE FENCE: the built customer app carries zero internal-tool code and
//      zero key material. Builds frontend/dist itself (offline, ~2s) so the
//      check can never silently pass against a stale build.
//   2. SERVING WIRING: a real production-mode boot serves the CUSTOMER app at
//      "/" (and as the SPA fallback for deep links) — verified by matching the
//      hashed entry script of the freshly built frontend/dist/index.html, not
//      by trusting the routing code (verify the destination, not the code).
//
// Offline + $0: no OpenAI calls. The boot uses the same local .env the dev API
// uses. Auto-discovered by scripts/run-tests.js.

const { spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "frontend", "dist");
const PORT = 3097; // scratch port — never the dev API (3001) or dev SPAs

let failed = 0;
function check(ok, label) {
  console.log(`${ok ? "ok" : "NOT OK"} - ${label}`);
  if (!ok) failed++;
}

// ---------- 1. build the customer app (fresh, so the fence can't go stale) ----------
const build = spawnSync(process.execPath, [
  path.join(ROOT, "node_modules", "vite", "bin", "vite.js"),
  "build", "--config", path.join(ROOT, "frontend", "vite.config.js"),
], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
check(build.status === 0, "customer app builds");
if (build.status !== 0) {
  console.error(build.stdout, build.stderr);
  process.exit(1);
}

// ---------- 2. the bundle fence ----------
// Internal-tool markers + key patterns that must NEVER ship to a customer.
// Strings chosen to be distinctive (no hash-collision false positives).
const FORBIDDEN = [
  "js-bench",             // persona bench markup (F-005)
  "getPersonaBench",      // bench API call
  "Replay test run",      // bench copy
  "/api/v1/admin/registered", // superadmin API path
  "Test engine",          // internal tool label
  "job-lexicons",         // internal tool route
  "The Sero Universe",    // internal tool heading
  "sk-proj-",             // OpenAI key shapes
  "sk-ant-",
  "OPENAI_API_KEY",
];
const bundleFiles = fs.readdirSync(path.join(DIST, "assets"))
  .filter((n) => n.endsWith(".js"))
  .map((n) => path.join(DIST, "assets", n));
bundleFiles.push(path.join(DIST, "index.html"));
const hits = [];
for (const file of bundleFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const marker of FORBIDDEN) {
    if (text.includes(marker)) hits.push(`${path.basename(file)}: ${marker}`);
  }
}
check(hits.length === 0, `customer bundle carries no internal-tool code or keys (${bundleFiles.length} files scanned)`);
for (const h of hits) console.log(`    leaked -> ${h}`);

// The customer index.html's hashed entry script — the fingerprint that proves
// which app a server response came from.
const customerIndex = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const entryMatch = customerIndex.match(/src="(\/assets\/index-[^"]+\.js)"/);
check(Boolean(entryMatch), "customer index.html has a hashed entry script");

// ---------- 3. a real production boot serves the customer app ----------
function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: pathname }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("timeout")));
  });
}

async function main() {
  const child = spawn(process.execPath, [path.join(ROOT, "backend", "api", "server.ts")], {
    cwd: ROOT,
    // APP_ENV: "local" — this test only proves prod STATIC serving, not live-DB behaviour.
    // Without it, NODE_ENV=production classifies the boot as "live" and server.ts refuses to
    // start with no DATABASE_URL (fine locally via .env, red in CI).
    env: { ...process.env, NODE_ENV: "production", APP_ENV: "local", PORT: String(PORT), API_PORT: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErr = "";
  child.stderr.on("data", (c) => (serverErr += c));

  try {
    // Wait for the health endpoint (self-migrating boot can take a moment).
    let up = false;
    for (let i = 0; i < 60; i++) {
      try {
        const r = await get("/api/v1/health");
        if (r.status === 200) { up = true; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    check(up, "production-mode server boots (health answers)");
    if (!up) {
      console.error(serverErr.slice(-2000));
      return;
    }

    const root = await get("/");
    check(root.status === 200, "GET / answers 200 in production mode");
    check(root.body.includes(entryMatch[1]),
      "GET / serves the CUSTOMER app (hashed entry script matches frontend/dist)");

    // SPA fallback: a customer deep link must come back as the customer app too.
    const deep = await get("/team");
    check(deep.status === 200 && deep.body.includes(entryMatch[1]),
      "deep link (/team) falls back to the customer index");

    // The API error shape survives: unknown /api/* stays JSON, never the SPA (F-001).
    const api404 = await get("/api/v1/definitely-not-a-route");
    check(api404.status === 404 && api404.body.includes("NOT_FOUND"),
      "unknown /api/* still answers the JSON error shape, not the SPA");
  } finally {
    child.kill();
  }
}

main().then(() => {
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nall customer-serving checks passed");
}).catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
