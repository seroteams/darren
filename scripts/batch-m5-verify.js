#!/usr/bin/env node
// M5 — live Toby replay + offline regression sweep.
// Run: node scripts/batch-m5-verify.js
// Live prep: node scripts/batch-m5-verify.js --live  (needs OPENAI_API_KEY)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const PINNED = path.join(ROOT, "logs/may/2026_May24_21-46-1eb839fd");
const REPORT = path.join(ROOT, "logs/may/2026_May24_batch/m5-toby-replay-report.json");

function run(args) {
  const res = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: process.env });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status === 0;
}

function main() {
  const live = process.argv.includes("--live");
  console.log("\n─── M5 Toby replay verification ───\n");

  let failed = 0;
  failed += run(["scripts/replay-scenario.js", "toby_growth_lead", "--fixtures-only"]) ? 0 : 1;
  failed += run(["scripts/replay-scenario.js", "toby-growth-career-plan", "--fixtures-only"]) ? 0 : 1;
  failed += run(["scripts/test-drill-cap.js"]) ? 0 : 1;

  let liveOk = null;
  if (live) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("\nOPENAI_API_KEY not set — skipping live prep.\n");
    } else {
      liveOk = run(["scripts/replay-scenario.js", "toby_growth_lead"]);
      if (!liveOk) failed += 1;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    pinned_session: fs.existsSync(PINNED) ? path.relative(ROOT, PINNED) : null,
    fixtures: ["toby_growth_lead", "toby-growth-career-plan"],
    live_prep: liveOk,
    ok: failed === 0,
    note: "Compare next live full run transcript to pinned May24 session manually or via /reviewrun.",
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${path.relative(ROOT, REPORT)}`);

  if (failed) {
    console.error(`\n${failed} M5 check(s) FAILED\n`);
    process.exit(1);
  }
  console.log("\n✓ M5 verification passed.\n");
}

main();
