#!/usr/bin/env node
const path = require("node:path");
const { applyManagerBriefingPostProcess } = require("../src/reviewer");
const {
  runManagerBriefingBans,
  runEvalIntegrityChecks,
} = require("../src/golden-checks");

const ROOT = path.join(__dirname, "..");
const scenario = require(path.join(
  ROOT,
  "scenarios/regression/priya_performance_quality_jun02.json"
));

let failed = 0;
const { golden_eval_bad: bad, axis_state, transcript } = scenario.golden;

const processed = applyManagerBriefingPostProcess(
  JSON.parse(JSON.stringify(bad)),
  axis_state,
  transcript
);

for (const f of runEvalIntegrityChecks(processed, axis_state, transcript, {
  requireStateMatch: true,
})) {
  console.error(`  FAIL  post-process: ${f}`);
  failed += 1;
}
if (!failed) console.log("  PASS  post-processed Jun02 bad eval matches axis_state");

const bans = runManagerBriefingBans(processed);
if (bans.length) {
  console.error("  FAIL  processed briefing bans:", bans.join("; "));
  failed += 1;
} else {
  console.log("  PASS  processed briefing passes manager bans");
}

if (failed) process.exit(1);
console.log("\n✓ briefing integrity tests passed.\n");
