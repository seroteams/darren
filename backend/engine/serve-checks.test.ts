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

// Audit fix 2026-07-31: since no-dead-wires P4 a real run's mid-run notes reach the
// evaluation. They are the manager's private observations but carry no judgment
// marker, so the marker-gated pass above never saw them. Stamped lines are screened
// at a 3-word run.
const STAMPED = "[14:26 @ q_energy] How's your energy? - He keeps glancing at his phone";

const ECHOED = { ...cleanBriefing, brutal_truth_employee: "One to watch: he keeps glancing at his phone." };

test("PRIVATE_NOTE_LEAK: a mid-run note reused verbatim in employee-facing text blocks", () => {
  const priv = checkPrivateNoteLeak(STAMPED, ECHOED);
  assert.ok(priv, "expected the stamped mid-run note to be caught");
  assert.equal(priv.reason, PRIVATE_NOTE_LEAK);
  assert.equal(screenBriefingLeaks(STAMPED, [], ECHOED).blocked, true);
});

test("PRIVATE_NOTE_LEAK: a mid-run note that shares only topic words does not block", () => {
  const shared = { ...cleanBriefing, summary_bullets: ["Shipped the refactor", "The phone rota moved"] };
  assert.equal(checkPrivateNoteLeak(STAMPED, shared), null);
  assert.equal(screenBriefingLeaks(STAMPED, [], shared).blocked, false);
});

test("PRIVATE_NOTE_LEAK: the stamp is what opens the 3-gram pass, not the words", () => {
  // Same words with no stamp: intake context the manager typed to be used. It has
  // no judgment marker, so the marker-gated pass leaves it alone and the new pass
  // must not start blocking it either.
  const intake = "How's your energy? - He keeps glancing at his phone";
  assert.equal(checkPrivateNoteLeak(intake, ECHOED), null);
});
