import test from "node:test";
import assert from "node:assert/strict";
import { buildEvaluationInputs } from "./evaluation-inputs.ts";
import type { Session } from "../../../shared/session.types.ts";

// Guard (runner-gates Phase 3): the customer-facing evaluation input must never
// carry the per-turn planner note. That note holds engine-only vocabulary tags
// ([SHALLOW], [THREAD-DEFERRED], …) which are decision signals for the runner
// and the manager's live dashboard — never prose for the reviewer model or an
// employee-facing surface. This locks the current-safe behaviour so a future
// edit can't silently re-add `note: t.note` and leak that vocab.

function sessionWithTaggedNote(): Session {
  return {
    focusPointsResult: { focus_points: [] },
    ctx: { notes: "" },
    notes: [],
    selectedFocusPoints: [],
    transcript: [
      {
        question: { name: "Where do you want to be?", alias: "q1", stage: "aspiration" },
        answer: "as a lead",
        skipped: false,
        note: "[SHALLOW] 'as a lead' restates current title — does not name a destination.",
        unbooked_signal: [],
      },
    ],
    axisState: {},
    agendaInput: null,
    agendaCovered: null,
  } as unknown as Session;
}

test("buildEvaluationInputs: engine note tags never reach the evaluation input", () => {
  const out = buildEvaluationInputs(sessionWithTaggedNote());
  const serialized = JSON.stringify(out);
  assert.ok(!serialized.includes("[SHALLOW]"), "evaluation input must not contain the [SHALLOW] tag");
  assert.ok(!serialized.includes("restates current title"), "evaluation input must not contain planner note prose");
});

test("buildEvaluationInputs: the transcript projection carries no `note` field", () => {
  const out = buildEvaluationInputs(sessionWithTaggedNote());
  for (const t of out.transcript) {
    assert.ok(!("note" in t), "projected transcript turns must not expose a note field");
  }
});
