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

// No dead wires Phase 1: the prep brief flows into the evaluation input so the
// briefing can answer plan-vs-reality. Absent prep must project as null, never
// undefined-shaped surprises downstream.
test("buildEvaluationInputs: the prep brief is projected when present", () => {
  const session = sessionWithTaggedNote();
  const brief = {
    coreIssue: "Cutover load",
    openingQuestion: "How is the cutover?",
    listenFor: ["whether he names it"],
    avoid: ["do not lead with the deadline"],
    goodOutcome: "One owned next step",
    suggestedAction: "During the 1:1, agree one task",
    confidence: "Medium",
    dontAssume: "Silence means disengagement",
    styleTip: "Keep it light.",
  };
  (session as unknown as { preparationResult: unknown }).preparationResult = {
    brief,
    runId: "r1",
    validation: { passed: true, issues: [] },
    attempts: 1,
  };
  const out = buildEvaluationInputs(session);
  assert.deepEqual(out.prep, brief);
});

test("buildEvaluationInputs: no prep brief projects as null", () => {
  const out = buildEvaluationInputs(sessionWithTaggedNote());
  assert.equal(out.prep, null);
});

// No dead wires P4: a real run's mid-run notes reach the evaluation notes
// channel; a QA-labelled run still strips stamped tester lines.
test("buildEvaluationInputs: real-run mid-run notes reach the notes channel", () => {
  const session = sessionWithTaggedNote();
  (session as unknown as { mode: string; runLabel: null }).mode = "manual";
  (session as unknown as { runLabel: null }).runLabel = null;
  (session as unknown as { notes: unknown }).notes = [
    { id: "n1", stage: "QUESTIONING", turn: 1, ts: 0, text: "He keeps glancing at his phone." },
  ];
  const out = buildEvaluationInputs(session);
  assert.ok(out.notes.includes("glancing at his phone"), "a real manager note must reach the evaluation");
});

test("buildEvaluationInputs: a QA-labelled run still excludes captured notes", () => {
  const session = sessionWithTaggedNote();
  (session as unknown as { mode: string }).mode = "manual";
  (session as unknown as { runLabel: string }).runLabel = "qa-sweep";
  (session as unknown as { notes: unknown }).notes = [
    { id: "n1", stage: "QUESTIONING", turn: 1, ts: 0, text: "this question is repeated a lot" },
  ];
  const out = buildEvaluationInputs(session);
  assert.ok(!out.notes.includes("repeated a lot"), "tester notes must stay out of QA-run evaluations");
});
