#!/usr/bin/env node
// Batch K — axis cluster verification (FX-26, FX-27, FX-28).
// Run: node scripts/batch-k-verify.js

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { PROMPTS_DIR } = require("../backend/engine/paths.mts");

const {
  isShallowAnswer,
  detectClarityMisalignment,
  expandSignatureForSignals,
  applyShallowGate,
  applyMisalignmentClarity,
  clampToSignature,
  enforceAxisCoverage,
} = require("../backend/engine/queue-manager");

function ok(label, cond) {
  if (cond) {
    console.log(`  PASS  ${label}`);
    return 0;
  }
  console.error(`  FAIL  ${label}`);
  return 1;
}

function checkShallowGate() {
  console.log("\n--- FX-26 shallow gate ---");
  let failed = 0;
  failed += ok('"fine" is shallow', isShallowAnswer("fine"));
  failed += ok('"today is fine" is shallow', isShallowAnswer("today is fine"));
  failed += ok('"yeah its been okay" is not shallow (4 tokens)', !isShallowAnswer("yeah its been okay"));
  failed += ok('substantive answer not shallow', !isShallowAnswer("I need clearer scope on the payments refactor"));

  const raw = { wellbeing: -1, growth: 1 };
  const issues = [];
  applyShallowGate(raw, { lastAnswer: "fine", note: "", issues });
  failed += ok("shallow zeros negative wellbeing", raw.wellbeing === 0);
  failed += ok("shallow zeros positive growth", raw.growth === 0);

  const raw2 = { clarity: -1 };
  applyShallowGate(raw2, { lastAnswer: "long answer here", note: "[SHALLOW] no specifics", issues });
  failed += ok("[SHALLOW] note zeros deltas", raw2.clarity === 0);

  return failed;
}

function checkMisalignment() {
  console.log("\n--- FX-28 clarity misalignment ---");
  let failed = 0;
  const answer = "i may think this and my boss may think that of what i need to learn";
  failed += ok("detects boss/self misalignment", detectClarityMisalignment(answer));

  const sig = expandSignatureForSignals({ growth: 3 }, answer);
  failed += ok("expands signature with clarity", sig.clarity === 3);

  const raw = { growth: -3 };
  const issues = [];
  applyMisalignmentClarity(raw, { lastAnswer: answer, signature: sig, issues });
  failed += ok("applies clarity negative", raw.clarity === -1);

  const { deltas } = clampToSignature(raw, sig);
  failed += ok("clamped clarity survives", deltas.clarity === -1);

  return failed;
}

function checkCoverage() {
  console.log("\n--- FX-28 coverage injection ---");
  let failed = 0;
  const axisState = {
    wellbeing: { history: [{}] },
    engagement: { history: [{}] },
    clarity: { history: [] },
    growth: { history: [{}] },
  };
  const queue = [{ alias: "q_next", axis_effects: { growth: 3 } }];
  const issues = [];
  enforceAxisCoverage({ newQueue: queue, axisState, turnNumber: 5, issues });
  failed += ok("injects clarity at turn 5", queue[0].axis_effects.clarity === 3);
  failed += ok("logs coverage issue", issues.some((i) => i.includes("coverage")));
  return failed;
}

function checkPromptAndUi() {
  console.log("\n--- Prompt + UI hunks (FX-27) ---");
  let failed = 0;
  const plan = fs.readFileSync(path.join(PROMPTS_DIR, "plan-turn.md"), "utf8");
  failed += ok("shallow vs neutral rule", plan.includes("Shallow vs neutral"));
  failed += ok("misalignment type", plan.includes("**Misalignment**"));
  failed += ok("coverage hard rule", plan.includes("Coverage (hard at turn 4+)"));

  const questioning = fs.readFileSync(path.join(ROOT, "admin/src/stages/questioning.js"), "utf8");
  failed += ok("questioning axes panel", questioning.includes("axes-host"));

  const briefing = fs.readFileSync(path.join(ROOT, "admin/src/stages/briefing.js"), "utf8");
  failed += ok("briefing axes explainer", briefing.includes("not word count"));
  return failed;
}

function checkMay27Replay() {
  console.log("\n--- May27 proxy replay ---");
  let failed = 0;
  const answer = "i may think this and my boss may think that of what i need to learn";
  const sig = expandSignatureForSignals({ growth: 3 }, answer);
  const raw = { growth: -3 };
  const issues = [];
  applyMisalignmentClarity(raw, { lastAnswer: answer, signature: sig, issues });
  const { deltas } = clampToSignature(raw, sig);
  failed += ok("Machar turn-5 would score clarity", deltas.clarity === -1);
  return failed;
}

function main() {
  let failed = 0;
  failed += checkShallowGate();
  failed += checkMisalignment();
  failed += checkCoverage();
  failed += checkPromptAndUi();
  failed += checkMay27Replay();
  console.log();
  if (failed) {
    console.error(`${failed} check(s) FAILED`);
    process.exit(1);
  }
  console.log("All Batch K checks passed.");
}

main();
