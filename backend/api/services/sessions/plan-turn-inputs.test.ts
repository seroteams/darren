import test from "node:test";
import assert from "node:assert/strict";
import { buildPlanTurnInputs } from "./plan-turn-inputs.ts";
import type { Session } from "../../../shared/session.types.ts";

// No dead wires P4: the preview input-builder must stay byte-honest with the
// live planStream, which now passes the manager's mid-run notes to the planner.

function baseSession(): Session {
  return {
    focusPointsResult: { focus_points: [] },
    ctx: { name: "Daryl", role: "UX Designer", seniority: "Mid", meetingType: "Bi-weekly check-in", notes: "" },
    notes: [
      { id: "n1", stage: "QUESTIONING", turn: 1, ts: 0, text: "He keeps glancing at his phone." },
    ],
    selectedFocusPoints: [],
    transcript: [],
    turn: 0,
    totalBudget: 6,
    axisState: {},
    queueRef: [
      { alias: "q_1", label: "T", name: "Question 1?", description: "d", purpose: "topic", stage: "pulse", axis_effects: { engagement: 1 }, source: "generated" },
    ],
    pendingAnswer: { raw: "fine", skipped: false, text: "fine" },
    closer: null,
    sessionBank: [],
  } as unknown as Session;
}

test("buildPlanTurnInputs: mid-run notes ride along to the planner", () => {
  const out = buildPlanTurnInputs(baseSession());
  assert.ok(Array.isArray(out.sessionNotes), "sessionNotes must be present");
  assert.equal(out.sessionNotes.length, 1);
  const first = out.sessionNotes[0] as { text?: string };
  assert.ok(String(first?.text).includes("glancing"), "the note text reaches the planner inputs");
});

test("buildPlanTurnInputs: no notes still yields an array (never undefined)", () => {
  const s = baseSession();
  (s as unknown as { notes: unknown }).notes = undefined;
  const out = buildPlanTurnInputs(s);
  assert.deepEqual(out.sessionNotes, []);
});
