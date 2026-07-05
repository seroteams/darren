#!/usr/bin/env node
// Offline test for the deterministic briefing fallback (next-stage Phase 3).
// When evaluation can't produce a real briefing, the manager must still get an
// honest minimal record — transcript facts + live scores, nothing invented, and
// clearly flagged. No model calls.

const assert = require("node:assert");
const { buildFallbackBriefing } = require("../backend/engine/reviewer.ts");
const { runManagerBriefingBans } = require("../backend/engine/golden-checks.ts");
const { initState, applyDeltas } = require("../backend/engine/axes.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

const ctx = { name: "Priya", role: "Senior backend engineer", seniority: "Senior", meetingType: "Bi-weekly check-in" };
const transcript = [
  { turn: 1, question: { alias: "q_a", name: "How have the last two weeks felt?" }, answer: "Honestly stretched — the launch slipped and I've been on call." },
  { turn: 2, question: { alias: "q_b", name: "What would help most?" }, answer: "(skipped)", skipped: true },
  { turn: 3, question: { alias: "q_c", name: "Anything you want me to take off your plate?" }, answer: "Hand off the on-call rotation for a sprint." },
];
const state = initState();
applyDeltas(state, { questionAlias: "q_a", answerExcerpt: "stretched", deltas: { wellbeing: -3 } });

const b = buildFallbackBriefing({ ctx, transcript, axisState: state });

check("flagged as generation_failed", () => assert.strictEqual(b.generation_failed, true));

check("headline plainly states generation failed", () =>
  assert.ok(/generation failed/i.test(b.headline), b.headline));

check("paragraph says nothing is inferred", () =>
  assert.ok(/not inferred|nothing.*inferred/i.test(b.understanding_paragraph), b.understanding_paragraph));

check("bullets are transcript-derived (answered turns only, skipped excluded)", () => {
  assert.strictEqual(b.summary_bullets.length, 2, `got ${b.summary_bullets.length}`);
  assert.ok(b.summary_bullets.every((s) => /^Asked: .+ — they said: /.test(s)), JSON.stringify(b.summary_bullets));
  assert.ok(!b.summary_bullets.some((s) => /skipped/i.test(s)), "skipped turn leaked into bullets");
});

check("axes carry the real live scores from axis_state", () => {
  const w = b.axes.find((a) => a.id === "wellbeing");
  assert.ok(w, "wellbeing axis missing");
  assert.strictEqual(w.score, state.wellbeing.score, `axis score ${w.score} !== state ${state.wellbeing.score}`);
  assert.ok(/could not be generated/i.test(w.meaning), w.meaning);
});

check("no invented narrative (brutal truths + actions empty)", () => {
  assert.strictEqual(b.brutal_truth_employee, "");
  assert.strictEqual(b.brutal_truth_manager, "");
  assert.deepStrictEqual(b.next_actions, []);
  assert.deepStrictEqual(b.watch_for, []);
  assert.strictEqual(b.engagement_read.read_status, "not_read");
});

check("passes the manager-briefing trust bans", () =>
  assert.deepStrictEqual(runManagerBriefingBans(b), []));

check("empty transcript still yields an honest, valid briefing", () => {
  const empty = buildFallbackBriefing({ ctx, transcript: [], axisState: state });
  assert.strictEqual(empty.generation_failed, true);
  assert.strictEqual(empty.summary_bullets.length, 1);
  assert.ok(/no answers/i.test(empty.summary_bullets[0]), empty.summary_bullets[0]);
});

if (failed) {
  console.error(`\ntest-briefing-fallback: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("PASS test-briefing-fallback");
