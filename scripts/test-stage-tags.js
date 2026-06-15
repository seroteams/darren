#!/usr/bin/env node
// Standing gate (arc-editor Phase 4): no question may be tagged to a phase id
// that no live arc has. An orphaned tag silently mis-routes (intro-queue sorts
// it to index 999) instead of erroring — this catches it offline in `npm test`.

const { runStageTagOrphanCheck } = require("../src/golden-checks");

const failures = runStageTagOrphanCheck();
if (failures.length) {
  console.error("Orphaned stage tags found:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("PASS test-stage-tags");
