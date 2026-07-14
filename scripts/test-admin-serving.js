#!/usr/bin/env node
// admin-live-deploy Phase 2 — the admin-serving proof, in two halves:
//
//   1. SECRET FENCE: the built admin app (admin/dist) carries NO key material.
//      The admin app is MEANT to hold internal-tool code (that's what it is), so —
//      unlike the customer fence (test-customer-serving.js) — we assert only that
//      no secrets leak, not "no internal code". Builds admin/dist itself (offline,
//      base "/admin/") so the check can never pass against a stale build.
//   2. SERVING WIRING: a real production boot serves the ADMIN app at "/admin/"
//      (and admin deep links fall back to the admin index), still serves the
//      CUSTOMER app at "/" (untouched), and a logged-out /api/v1/admin/* still
//      answers the JSON 401 error shape — never the SPA. Verified by matching each
//      app's hashed entry script (verify the destination, not the code).
//
// Offline + $0: no OpenAI calls. Boots with the same local .env the dev API uses.
// Auto-discovered by scripts/run-tests.js.

const { spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const ROOT = path.join(__dirname, "..");
const ADMIN_DIST = path.join(ROOT, "admin", "dist");
const CUSTOMER_DIST = path.join(ROOT, "frontend", "dist");
const PORT = 3099; // scratch port — never the dev API (3001), dev SPAs, or 3097 (customer test)

let failed = 0;
function check(ok, label) {
  console.log(`${ok ? "ok" : "NOT OK"} - ${label}`);
  if (!ok) failed++;
}

// ---------- 1. build BOTH apps fresh (the live deploy ships both) ----------
function build(label, args) {
  const r = spawnSync(process.execPath,
    [path.join(ROOT, "node_modules", "vite", "bin", "vite.js"), ...args],
    { cwd: ROOT, encoding: "utf8", timeout: 180_000 });
  check(r.status === 0, `${label} builds`);
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
}
build("admin app", ["build"]); // admin/dist, vite base "/admin/"
build("customer app", ["build", "--config", path.join(ROOT, "frontend", "vite.config.js")]);

// ---------- 2. the secret fence (admin dist ships no secret VALUES) ----------
// The admin app is the internal console, so — unlike the customer fence — it may legitimately
// NAME env vars (the superadmin Guide page documents them: "OPENAI_API_KEY", "DATABASE_URL", …).
// A name is public; only a secret VALUE is a leak. So we fence on real value SHAPES, and — when
// a local .env is present — on the literal values of this environment's actual secrets (the
// strongest, most direct check). Non-VITE env vars are never inlined by vite, so a leak here
// would mean a hardcoded credential — exactly what this catches.
const SECRET_VALUE_PATTERNS = [
  /sk-proj-[A-Za-z0-9_-]{10,}/, // OpenAI project key
  /sk-ant-[A-Za-z0-9_-]{10,}/,  // Anthropic key
  /AIza[A-Za-z0-9_-]{20,}/,     // Google / Gemini key
  /postgres(?:ql)?:\/\/[^\s"'`]+/, // a Postgres connection string (a DATABASE_URL value)
  /\bre_[A-Za-z0-9]{12,}/,      // Resend API key (EMAIL_API_KEY value)
];
const envSecrets = [];
try {
  const envText = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  const SENSITIVE = /^(OPENAI_API_KEY|GEMINI_API_KEY|DATABASE_URL|LIVE_DATABASE_URL|EMAIL_API_KEY)=(.+)$/;
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(SENSITIVE);
    if (m) { const v = m[2].trim().replace(/^["']|["']$/g, ""); if (v.length > 8) envSecrets.push(v); }
  }
} catch { /* no .env (fresh clone) — the shape patterns still fence */ }

const adminFiles = fs.readdirSync(path.join(ADMIN_DIST, "assets"))
  .filter((n) => n.endsWith(".js"))
  .map((n) => path.join(ADMIN_DIST, "assets", n));
adminFiles.push(path.join(ADMIN_DIST, "index.html"));
const hits = [];
for (const file of adminFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const re of SECRET_VALUE_PATTERNS) { const m = text.match(re); if (m) hits.push(`${path.basename(file)}: ${m[0].slice(0, 12)}…`); }
  for (const val of envSecrets) { if (text.includes(val)) hits.push(`${path.basename(file)}: a literal .env secret value`); }
}
check(hits.length === 0, `admin bundle carries no secret VALUES (${adminFiles.length} files scanned, ${envSecrets.length} .env secrets checked)`);
for (const h of hits) console.log(`    leaked -> ${h}`);

// Each app's hashed entry script is its fingerprint. The admin app is served under
// base "/admin/" so its entry lives at /admin/assets/...; the customer app at root.
const adminIndex = fs.readFileSync(path.join(ADMIN_DIST, "index.html"), "utf8");
const adminEntry = adminIndex.match(/src="(\/admin\/assets\/index-[^"]+\.js)"/);
check(Boolean(adminEntry), "admin index.html references assets under /admin/ (vite base wired)");

const customerIndex = fs.readFileSync(path.join(CUSTOMER_DIST, "index.html"), "utf8");
const customerEntry = customerIndex.match(/src="(\/assets\/index-[^"]+\.js)"/);
check(Boolean(customerEntry), "customer index.html has a root hashed entry script");

// ---------- 3. a real production boot serves each app at the right path ----------
function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: pathname }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("timeout")));
  });
}

async function main() {
  const child = spawn(process.execPath, [path.join(ROOT, "backend", "api", "server.ts")], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", PORT: String(PORT), API_PORT: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErr = "";
  child.stderr.on("data", (c) => (serverErr += c));

  try {
    let up = false;
    for (let i = 0; i < 60; i++) {
      try { const r = await get("/api/v1/health"); if (r.status === 200) { up = true; break; } } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    check(up, "production-mode server boots (health answers)");
    if (!up) { console.error(serverErr.slice(-2000)); return; }

    // ADMIN app under /admin/
    const adminRoot = await get("/admin/");
    check(adminRoot.status === 200 && adminEntry && adminRoot.body.includes(adminEntry[1]),
      "GET /admin/ serves the ADMIN app (hashed entry matches admin/dist)");
    check((adminRoot.headers["x-robots-tag"] || "").includes("noindex"),
      "admin responses carry X-Robots-Tag: noindex");

    // An admin deep link falls back to the admin index (not the customer app, not a 404).
    const adminDeep = await get("/admin/errors");
    check(adminDeep.status === 200 && adminEntry && adminDeep.body.includes(adminEntry[1]),
      "admin deep link (/admin/errors) falls back to the admin index");

    // CUSTOMER app at "/" is untouched.
    const root = await get("/");
    check(root.status === 200 && customerEntry && root.body.includes(customerEntry[1]),
      "GET / still serves the CUSTOMER app (untouched)");
    const custDeep = await get("/team");
    check(custDeep.status === 200 && customerEntry && custDeep.body.includes(customerEntry[1]),
      "customer deep link (/team) still falls back to the customer index");

    // A logged-out superadmin API stays JSON 401 — never the SPA (the fence still holds).
    const apiAuth = await get("/api/v1/admin/registered");
    check(apiAuth.status === 401 && !apiAuth.body.includes("<!doctype") && !apiAuth.body.includes("<html"),
      "logged-out /api/v1/admin/* answers JSON 401, not the SPA");
  } finally {
    child.kill();
  }
}

main().then(() => {
  if (failed > 0) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nall admin-serving checks passed");
}).catch((e) => { console.error("test crashed:", e); process.exit(1); });
