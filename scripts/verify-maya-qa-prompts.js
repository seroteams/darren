#!/usr/bin/env node
// Offline contract check for Maya QA fixes B1/B3/B4 (no API).
// B1 runtime: scripts/test-recurring-gap-damper.js
// B3/B4 copy: prompt strings in final-evaluation.md

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { PROMPTS_DIR } = require("../backend/engine/paths.mts");
const evalMd = fs.readFileSync(
  path.join(PROMPTS_DIR, "final-evaluation.md"),
  "utf8"
);
const qm = fs.readFileSync(path.join(ROOT, "backend", "engine", "queue-manager.js"), "utf8");

function ok(label, cond) {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
  return cond ? 0 : 1;
}

let failed = 0;
console.log("\n─── Maya QA prompt/runtime contract (offline) ───\n");

failed += ok(
  "B3 concentration guard in final-evaluation.md",
  /Concentration guard/.test(evalMd) && /≤2 \*distinct\* `answer_excerpt`s/.test(evalMd)
);
failed += ok(
  "B4 coercive verbs — anywhere in final-evaluation.md",
  /No coercive verbs — anywhere/.test(evalMd) &&
    /next_actions/.test(evalMd) &&
    /brutal_truth_\*/.test(evalMd) &&
    /pin her to/.test(evalMd)
);
failed += ok(
  "B1 applyRecurringGapClarityDamper exported",
  /applyRecurringGapClarityDamper/.test(qm) &&
    /function applyRecurringGapClarityDamper/.test(qm)
);
failed += ok(
  "B1 wired in planTurn after applyMisalignmentClarity",
  /applyMisalignmentClarity\([\s\S]*applyRecurringGapClarityDamper/.test(qm)
);

if (failed) {
  console.error(`\n${failed} contract check(s) FAILED\n`);
  process.exit(1);
}
console.log("\n✓ Offline Maya QA contract checks passed.");
console.log(
  "  Live B1 (−5..−7 clarity): manual Performance run — not scripted persona bench."
);
console.log(
  "  Live B3/B4 copy: re-run scripted maya-chen or manual session; inspect logs/.../evaluation/\n"
);
