#!/usr/bin/env node
// Offline proof for Phase 1 (briefing-grounding-fixes).
// Replays the ACTUAL Maya Jun17 scripted run's raw per-turn clarity deltas
// through the (now theme-aware) recurring-gap damper and shows clarity no
// longer floors at -9/-10. Free — no API calls.
//
//   node scripts/verify-maya-jun17-damper.js

const assert = require("node:assert/strict");
const { initState, applyDeltas } = require("../backend/engine/axes");
const { applyRecurringGapClarityDamper } = require("../backend/engine/queue-manager");

// The run as it happened: question purpose was "scripted" (not "competency"),
// which is why the original purpose-gated damper never fired and clarity hit -10.
// rawClarity = the planner's pre-damper clarity delta for each turn.
const turns = [
  { alias: "q_open_anything_to_cover", answer: "wants to dig into how she judges 'ready to share' — thinks that's where the rework starts", rawClarity: 0 },
  { alias: "q_ready_to_share", answer: "checks main screens. doesn't check edge cases / empty states before sharing", rawClarity: -1 },
  { alias: "q_review_round_example", answer: "onboarding dashboard. 3 review rounds. missed the edge cases in the empty states", rawClarity: -3 },
  { alias: "q_empty_states_miss", answer: "missed the zero-data path for new users. empty state read as too generic", rawClarity: -1 },
  { alias: "q_ready_sooner", answer: "flow and edge cases surface late. screens look fine, review finds missing states / unclear rationale", rawClarity: -3 },
  { alias: "q_gap_pattern", answer: "still working out why one direction beats another. mostly edge cases and flow", rawClarity: -3 },
  { alias: "q_drafting_habit", answer: "depends how much of the flow she checks before sharing. main screens only → gaps in review", rawClarity: -1 },
  { alias: "q_next_review_focus", answer: "wants to check the full flow before review. empty states, edge cases, explain the direction", rawClarity: 1 },
];

function simulate(useDamper) {
  const state = initState();
  const transcript = [];
  for (const t of turns) {
    const lastQuestion = { alias: t.alias, purpose: "scripted", axis_effects: { clarity: 3 } };
    const deltas = {};
    if (t.rawClarity !== 0) deltas.clarity = t.rawClarity;

    if (useDamper) {
      const issues = [];
      applyRecurringGapClarityDamper(deltas, {
        lastQuestion,
        transcript: transcript.slice(),
        issues,
        lastAnswer: t.answer,
      });
    }

    const turnRecord = { question: lastQuestion, answer: t.answer, realized_deltas: { ...deltas } };
    transcript.push(turnRecord);
    if (Object.keys(deltas).length) {
      applyDeltas(state, { questionAlias: t.alias, answerExcerpt: t.answer, deltas });
    }
  }
  return state.clarity.score;
}

const before = simulate(false);
const after = simulate(true);

console.log("\n─── Maya Jun17 clarity replay (scripted run) ───\n");
console.log(`  Without damper (as shipped): clarity = ${before}`);
console.log(`  With theme-aware damper:     clarity = ${after}\n`);

let failed = 0;
function ok(label, cond) {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failed++;
}

ok(`reproduces the floored score without the fix (${before} <= -9)`, before <= -9);
ok(`fix lifts clarity off the floor (${after} > -9)`, after > -9);
ok(`fix lands clarity mid-range, not near-zero (-7..-3)`, after >= -7 && after <= -3);

if (failed) {
  console.error(`\n${failed} verify-maya-jun17-damper check(s) FAILED\n`);
  process.exit(1);
}
console.log("\n✓ verify-maya-jun17-damper passed.\n");
