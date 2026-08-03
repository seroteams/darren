import test from "node:test";
import assert from "node:assert/strict";
import { buildEvaluationInputs } from "./evaluation-inputs.ts";
import { PLANNER_FAILED_NOTE } from "../../../engine/run-health.ts";
import type { PriorCheckin, Session } from "../../../shared/session.types.ts";

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

// Notes are admin-only QA (Carl, 2026-07-31): they assess a run, they are never
// input to one. P4's real-run carve-out is reverted; the strip has no exceptions.
test("buildEvaluationInputs: mid-run notes never reach the notes channel", () => {
  for (const lane of [
    { mode: "manual", runLabel: null },
    { mode: "manual", runLabel: "qa-sweep" },
    { mode: "scripted", runLabel: null },
  ]) {
    const session = sessionWithTaggedNote();
    Object.assign(session as unknown as Record<string, unknown>, lane, {
      notes: [{ id: "n1", stage: "QUESTIONING", turn: 1, ts: 0, text: "He keeps glancing at his phone." }],
    });
    const out = buildEvaluationInputs(session);
    assert.ok(
      !out.notes.includes("glancing at his phone"),
      `an admin QA note must stay out of the evaluation (mode=${lane.mode}, runLabel=${lane.runLabel})`
    );
  }
});

test("buildEvaluationInputs: the manager's intake note still reaches the evaluation", () => {
  const session = sessionWithTaggedNote();
  (session as unknown as { ctx: Record<string, unknown> }).ctx.notes = "The Odin cutover is slipping.";
  const out = buildEvaluationInputs(session);
  assert.ok(out.notes.includes("Odin cutover"), "intake context is engine input and must survive");
});

// Preview/live parity: the live evaluation stream (session-streams.ts) also sends
// scoring health rebuilt from the transcript and the card-zero prior check-in.
// Without these the preview always rendered the "OK" scoring default and the
// no-check-in sentinel even when the live prompt would differ (engine honesty).

test("buildEvaluationInputs: scoring health is rebuilt from the transcript", () => {
  const session = sessionWithTaggedNote();
  session.transcript.push(
    {
      question: { name: "What blocks you?", alias: "q2", stage: "friction" },
      answer: "",
      skipped: false,
      note: PLANNER_FAILED_NOTE,
      unbooked_signal: [],
    } as unknown as Session["transcript"][number],
    {
      question: { name: "Anything else?", alias: "q3", stage: "close" },
      answer: "",
      skipped: true,
      unbooked_signal: [],
    } as unknown as Session["transcript"][number],
  );
  const out = buildEvaluationInputs(session);
  // 2 non-skipped turns, 1 carrying the planner-failed sentinel.
  assert.deepEqual(out.scoring, { failures: 1, scoredTurns: 2 });
});

test("buildEvaluationInputs: the prior check-in is projected when present", () => {
  const session = sessionWithTaggedNote();
  const checkin: PriorCheckin = {
    fromSessionId: "s-prior",
    skipped: false,
    outcomes: [{ id: "p1", owner: "manager", action: "Book the review", outcome: "yes" }],
    at: 1753800000000,
  };
  session.priorCheckin = checkin;
  const out = buildEvaluationInputs(session);
  assert.deepEqual(out.priorCheckin, checkin);
});

test("buildEvaluationInputs: no prior check-in projects as null", () => {
  const out = buildEvaluationInputs(sessionWithTaggedNote());
  assert.equal(out.priorCheckin, null);
});
