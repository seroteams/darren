// H4 — serve-time leak detection. These guard the two block-critical detectors
// (moved here from evals/trust-checks.ts) and the screenBriefingLeaks wrapper the
// live evaluate() path calls.
import test from "node:test";
import assert from "node:assert/strict";
import {
  screenBriefingLeaks,
  checkPrivateNoteLeak,
  checkInferredStateLeak,
  PRIVATE_NOTE_LEAK,
  INFERRED_STATE_LEAK,
} from "./serve-checks.ts";

// A clean, shareable briefing (nothing employee-facing carries private judgment
// or an invented state).
const cleanBriefing = {
  headline: "Strong week on the payments refactor",
  summary_bullets: ["Shipped the refactor", "Unblocked a teammate"],
  brutal_truth_employee: "Keep pushing on code review turnaround.",
  brutal_truth_manager: "I doubt he's ready to lead just yet.",
  engagement_read: { observed_shift: "" },
  axes: [],
};

test("clean briefing: no block", () => {
  const s = screenBriefingLeaks("shipped payments refactor this week", [], cleanBriefing);
  assert.equal(s.blocked, false);
  assert.deepEqual(s.reasons, []);
});

test("PRIVATE_NOTE_LEAK: manager's private judgment reused in employee-facing text", () => {
  const notes = "I doubt he's ready to lead the team.";
  const leaked = { ...cleanBriefing, brutal_truth_employee: "You're not ready to lead yet." };
  const priv = checkPrivateNoteLeak(notes, leaked);
  assert.ok(priv, "expected a private-note leak");
  assert.equal(priv.reason, PRIVATE_NOTE_LEAK);

  const s = screenBriefingLeaks(notes, [], leaked);
  assert.equal(s.blocked, true);
  assert.ok(s.reasons.includes(PRIVATE_NOTE_LEAK));
});

test("INFERRED_STATE_LEAK: invented state in employee-facing text the input never carried", () => {
  const notes = "Shipped the refactor, helped a teammate.";
  const leaked = { ...cleanBriefing, brutal_truth_employee: "You've seemed disengaged lately." };
  const inferred = checkInferredStateLeak(notes, [], leaked);
  assert.ok(inferred.length > 0, "expected an inferred-state leak");

  const s = screenBriefingLeaks(notes, [], leaked);
  assert.equal(s.blocked, true);
  assert.ok(s.reasons.includes(INFERRED_STATE_LEAK));
});

test("employee-authored state is allowed (said it themselves in the session)", () => {
  const notes = "Shipped the refactor.";
  const leaked = { ...cleanBriefing, brutal_truth_employee: "You mentioned feeling disengaged — let's dig in." };
  const transcript = [{ answer: "Honestly I've felt disengaged this sprint." }];
  const s = screenBriefingLeaks(notes, transcript, leaked);
  assert.equal(s.blocked, false, "a state the employee themselves said is not a leak");
});
