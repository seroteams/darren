#!/usr/bin/env node
// M4 — wire scenarios/batch/ into replay harness.
// Offline: node scripts/batch-m4-verify.js
// Also runs regression fixture sweep for parity.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { SCENARIOS_DIR } = require("../backend/engine/paths.mts");

const ROOT = path.join(__dirname, "..");
const BATCH_DIR = path.join(SCENARIOS_DIR, "batch");
const REPLAY = path.join(ROOT, "scripts/replay-scenario.js");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ok(label, cond) {
  if (cond) {
    console.log(`  PASS  ${label}`);
    return 0;
  }
  console.error(`  FAIL  ${label}`);
  return 1;
}

function runReplay(args) {
  const res = spawnSync(process.execPath, [REPLAY, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status === 0 ? 0 : 1;
}

function main() {
  console.log("\n─── M4 batch replay wiring ───\n");

  let failed = 0;

  const indexPath = path.join(BATCH_DIR, "_index.json");
  const index = loadJson(indexPath);
  failed += ok("batch/_index.json exists", fs.existsSync(indexPath));

  const filesOnDisk = fs
    .readdirSync(BATCH_DIR)
    .filter((f) => f.endsWith(".json") && f !== "_index.json");
  failed += ok("index covers all batch JSON files", index.length === filesOnDisk.length);

  for (const entry of index) {
    const filePath = path.join(BATCH_DIR, entry.file);
    failed += ok(`${entry.file} on disk`, fs.existsSync(filePath));
  }

  console.log("\n─── Batch offline replay ───");
  failed += runReplay(["--batch-all", "--fixtures-only"]);

  console.log("\n─── Regression offline replay ───");
  failed += runReplay(["--regression-all", "--fixtures-only"]);

  const report = {
    generated_at: new Date().toISOString(),
    batch_count: index.length,
    regression_count: loadJson(path.join(SCENARIOS_DIR, "regression/_index.json")).length,
    ok: failed === 0,
  };
  const reportPath = path.join(ROOT, "logs/may/2026_May24_batch/m4-batch-replay-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${path.relative(ROOT, reportPath)}`);

  if (failed) {
    console.error(`\n${failed} M4 check(s) FAILED\n`);
    process.exit(1);
  }
  console.log("\n✓ M4 batch replay wiring passed.\n");
}

main();
