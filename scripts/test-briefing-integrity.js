#!/usr/bin/env node
const path = require("node:path");
const { applyManagerBriefingPostProcess } = require("../backend/engine/reviewer.ts");
const {
  runManagerBriefingBans,
  runEvalIntegrityChecks,
} = require("../backend/engine/golden-checks.ts");

const { SCENARIOS_DIR } = require("../backend/engine/paths.mts");
const scenario = require(path.join(
  SCENARIOS_DIR,
  "regression/priya_performance_quality_jun02.json"
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

// Post-processing intentionally no longer scrubs banned phrases from the model's
// text (that silently masked real output). A deliberately-bad eval must therefore
// STILL trip the ban detector after post-process — we surface garbage, not rewrite it.
const bans = runManagerBriefingBans(processed);
if (bans.length === 0) {
  console.error("  FAIL  expected golden_eval_bad to still trip manager bans after post-process (masking should be gone)");
  failed += 1;
} else {
  console.log(`  PASS  post-process surfaces (does not mask) ${bans.length} manager-ban issue(s)`);
}

if (failed) process.exit(1);
console.log("\n✓ briefing integrity tests passed.\n");
