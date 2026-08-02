// H3 — degradation alarm. buildRunHealth summarises a single run's quiet
// failures (planner throws + evaluation fallback) so the *rate* is visible.
import test from "node:test";
import assert from "node:assert/strict";
import { buildRunHealth, scoringFromTranscript, PLANNER_FAILED_NOTE } from "./run-health.ts";

const ok = { note: "moving well" };
const failed = { note: PLANNER_FAILED_NOTE };

// scoringFromTranscript — the live path reconstructs the same {failures, scoredTurns}
// the CLI counts inline, so the reviewer's low-confidence guard fires identically on both.
// A skipped turn was never scored, so it counts toward neither number.
test("scoringFromTranscript counts failed scored turns, ignoring skipped ones", () => {
  const t = [
    { note: "ok", skipped: false },
    { note: PLANNER_FAILED_NOTE, skipped: false },
    { note: PLANNER_FAILED_NOTE, skipped: true }, // skipped — never scored, ignored
    { note: "ok", skipped: false },
  ];
  assert.deepEqual(scoringFromTranscript(t), { failures: 1, scoredTurns: 3 });
});

test("scoringFromTranscript: a clean run reports zero failures", () => {
  assert.deepEqual(scoringFromTranscript([ok, ok, ok]), { failures: 0, scoredTurns: 3 });
});

test("scoringFromTranscript is safe on empty / missing input", () => {
  assert.deepEqual(scoringFromTranscript([]), { failures: 0, scoredTurns: 0 });
  assert.deepEqual(scoringFromTranscript(null), { failures: 0, scoredTurns: 0 });
  assert.deepEqual(scoringFromTranscript(undefined), { failures: 0, scoredTurns: 0 });
});

test("healthy run: nothing degraded", () => {
  const h = buildRunHealth([ok, ok, ok], false);
  assert.equal(h.planner_failed_turns, 0);
  assert.equal(h.total_turns, 3);
  assert.equal(h.evaluation_degraded, false);
  assert.equal(h.degraded, false);
});

test("counts the turns whose planner failed", () => {
  const h = buildRunHealth([ok, failed, ok, failed], false);
  assert.equal(h.planner_failed_turns, 2);
  assert.equal(h.total_turns, 4);
  assert.equal(h.degraded, true);
});

test("evaluation fallback alone marks the run degraded", () => {
  const h = buildRunHealth([ok, ok], true);
  assert.equal(h.planner_failed_turns, 0);
  assert.equal(h.evaluation_degraded, true);
  assert.equal(h.degraded, true);
});

test("a serve-time leak block marks the run degraded and records the reasons", () => {
  const h = buildRunHealth([ok, ok], false, ["PRIVATE_NOTE_LEAK"]);
  assert.equal(h.leak_blocked, true);
  assert.deepEqual(h.leak_reasons, ["PRIVATE_NOTE_LEAK"]);
  assert.equal(h.evaluation_degraded, false); // model succeeded; we chose to block
  assert.equal(h.degraded, true);
});

test("no leak reasons: leak_blocked is false", () => {
  const h = buildRunHealth([ok], false);
  assert.equal(h.leak_blocked, false);
  assert.deepEqual(h.leak_reasons, []);
});

// sharper-questions P1 — question quality. A turn that produced no axis movement
// bought nothing: the manager spent one of six questions and learned nothing scorable.
// Counting it is the whole point of the phase; nothing graded the questions before.
test("zero_signal_turns counts turns whose deltas are empty or all zero", () => {
  const h = buildRunHealth(
    [
      { note: "moved", realized_deltas: { clarity: -1 } },
      { note: "nothing", realized_deltas: {} }, // empty
      { note: "nothing", realized_deltas: { growth: 0, clarity: 0 } }, // all zero
      { note: "no field at all" }, // missing
      { note: "moved", realized_deltas: { wellbeing: 2 } },
    ],
    false,
  );
  assert.equal(h.zero_signal_turns, 3);
  assert.equal(h.scored_turns, 5);
});

test("a skipped turn is not counted as zero-signal — it was never asked", () => {
  const h = buildRunHealth(
    [
      { note: "moved", realized_deltas: { clarity: 1 } },
      { note: "skipped", realized_deltas: {}, skipped: true },
    ],
    false,
  );
  assert.equal(h.zero_signal_turns, 0);
  assert.equal(h.scored_turns, 1);
});

// The agency rule (plan-turn.md "THE TRIGGER") marks its turns with [AGENCY]. It fired
// in 2 runs on the day it shipped and never since, and nothing noticed. This counter is
// what makes that visible without reading transcripts by hand.
test("agency_fired counts the turns carrying the [AGENCY] marker", () => {
  const h = buildRunHealth(
    [
      { note: "ordinary follow-up" },
      { note: "[AGENCY] pressed on the stalled mentoring ask" },
      { note: "ordinary" },
      { note: "chased the commitment [AGENCY]" },
    ],
    false,
  );
  assert.equal(h.agency_fired, 2);
});

test("zero signal and no agency do NOT mark the run degraded", () => {
  // Degraded means the engine broke. A weak question is a quality problem, not a
  // failure, and conflating them would make the degradation alarm useless.
  const h = buildRunHealth([{ note: "flat", realized_deltas: {} }], false);
  assert.equal(h.zero_signal_turns, 1);
  assert.equal(h.agency_fired, 0);
  assert.equal(h.degraded, false);
});

test("empty / missing transcript is safe", () => {
  const h = buildRunHealth([], false);
  assert.equal(h.total_turns, 0);
  assert.equal(h.degraded, false);

  const h2 = buildRunHealth(null, true);
  assert.equal(h2.total_turns, 0);
  assert.equal(h2.planner_failed_turns, 0);
  assert.equal(h2.degraded, true);
});
