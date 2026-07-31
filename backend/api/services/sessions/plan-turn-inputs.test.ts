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

// Notes are admin-only QA (Carl, 2026-07-31): they must not steer a question.
// P4 wired them to the planner (prompt block AND grounding corpus); reverted.
test("buildPlanTurnInputs: mid-run notes never reach the planner", () => {
  const out = buildPlanTurnInputs(baseSession()) as Record<string, unknown>;
  assert.ok(!("sessionNotes" in out), "the planner inputs must carry no notes key at all");
  assert.ok(
    !JSON.stringify(out).includes("glancing"),
    "no note text may reach the planner by any route, prompt block or grounding corpus"
  );
});

test("buildPlanTurnInputs: a session with no notes builds the same inputs", () => {
  const withNotes = buildPlanTurnInputs(baseSession());
  const s = baseSession();
  (s as unknown as { notes: unknown }).notes = undefined;
  assert.deepEqual(buildPlanTurnInputs(s), withNotes, "notes must make no difference to the planner");
});
