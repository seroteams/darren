#!/usr/bin/env node
// Offline test runner: runs every assertion script that doesn't need an API key,
// in its own process (so a test's process.exit doesn't kill the runner), and
// fails with a non-zero exit code if any of them fail.
//
// API-dependent checks (smoke, sweep, eval batches, test-prep-role-diff) are NOT
// run here — they cost money and need live keys. Run those manually.

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const SCRIPTS_DIR = __dirname;

const OFFLINE_TESTS = [
  "test-answer-suggest-shape.js",
  "test-axis-coverage.js",
  "test-briefing-integrity.js",
  "test-briefing-prompt-rules.js",
  "test-delta-snap.js",
  "test-drill-cap.js",
  "test-empty-signature.js",
  "test-engagement-read.js",
  "test-intro-order.js",
  "test-lexicon.js",
  "test-lexicon-promote.js",
  "test-opener-routing.js",
  "test-person-profile.js",
  "test-persona-bench.js",
  "test-prep-wording.js",
  "test-question-integrity.js",
  "test-question-validator.js",
  "test-read-quality.js",
  "test-recurring-gap-damper.js",
  "test-role-profile.js",
  "test-trust-checks.js",
];

let failed = 0;

for (const file of OFFLINE_TESTS) {
  const res = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, file)], {
    encoding: "utf8",
  });
  if (res.status === 0) {
    console.log(`PASS  ${file}`);
  } else {
    failed++;
    console.error(`FAIL  ${file}`);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trimEnd();
    if (out) console.error(out.replace(/^/gm, "      "));
  }
}

console.log(`\n${OFFLINE_TESTS.length - failed}/${OFFLINE_TESTS.length} passed`);
process.exit(failed ? 1 : 0);
