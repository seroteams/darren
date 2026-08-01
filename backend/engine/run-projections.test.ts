import { test } from "node:test";
import assert from "node:assert/strict";
import { agendaOf, priorActionsOf, roleProfileOf, reviewTurns, reviewExtras } from "./run-projections.ts";

// The Run Review's extras (QA tooling). Every block is read off the run, never
// invented: a run without an agenda / prior-actions card / role profile answers
// null so the review drops the section instead of showing an empty heading.

test("agendaOf: the typed agenda plus whether it was used and covered; null when none", () => {
  assert.deepEqual(
    agendaOf({ agendaInput: { raw: "promotion path", summary: "Wants a promotion timeline" }, agendaInjected: true, agendaCovered: false }),
    { raw: "promotion path", summary: "Wants a promotion timeline", injected: true, covered: false },
  );
  assert.equal(agendaOf({ agendaInput: null }), null);
  assert.equal(agendaOf({}), null, "a run that predates the agenda input is not an empty agenda");
  assert.equal(
    agendaOf({ agendaInput: { raw: "x", summary: "" } })?.covered,
    null,
    "covered stays 'not judged' rather than collapsing to false",
  );
});

test("priorActionsOf: declared taps only, and a skip is recorded as a skip", () => {
  assert.deepEqual(
    priorActionsOf({
      priorCheckin: {
        fromSessionId: "run_a",
        skipped: false,
        outcomes: [
          { id: "p1", owner: "manager", action: "Send the scope note", outcome: "yes" },
          { id: "p2", owner: "report", action: "", outcome: "no" },
        ],
      },
    }),
    { fromSessionId: "run_a", skipped: false, outcomes: [{ owner: "manager", action: "Send the scope note", outcome: "yes" }] },
    "an action-less tap is dropped, not padded out",
  );
  assert.deepEqual(priorActionsOf({ priorCheckin: { fromSessionId: "", skipped: true, outcomes: [] } }), {
    fromSessionId: "",
    skipped: true,
    outcomes: [],
  });
  assert.equal(priorActionsOf({}), null, "no card met = null, not an empty check-in");
});

test("roleProfileOf: the cached context the prompts were fed; null when the run predates the stage", () => {
  const rp = roleProfileOf(
    { key: "senior-backend-engineer--senior", status: "cached" },
    { profile: { summary: "Builds services.", listen_for: ["Tradeoffs", ""], avoid: ["Feature-factory framing"], known_challenges: [1, 2, 3] } },
  );
  assert.deepEqual(rp, {
    key: "senior-backend-engineer--senior",
    status: "cached",
    summary: "Builds services.",
    listenFor: ["Tradeoffs"],
    avoid: ["Feature-factory framing"],
    challenges: 3,
  });
  assert.equal(roleProfileOf(null, null), null);
});

test("reviewTurns: the question as the manager met it, with coach hints and the planner's read", () => {
  const turns = reviewTurns([
    {
      question: {
        alias: "q_opener_1",
        name: "How has the week felt?",
        description: "Gives them the frame.",
        purpose: "wellbeing",
        stage: "pulse",
        source: "generated",
        hints: [{ kind: "ask", text: "Keep it calm." }],
      },
      answer: "Flat.",
      skipped: false,
      note: "Mild flatness signal.",
      read: "note",
    },
  ]);
  assert.equal(turns.length, 1);
  const [turn] = turns;
  assert.deepEqual(turn?.hints, [{ kind: "ask", text: "Keep it calm." }]);
  assert.equal(turn?.purpose, "wellbeing");
  assert.equal(turn?.note, "Mild flatness signal.", "the planner note rides the INTERNAL review projection");
  assert.equal(turn?.read, "note");
});

test("reviewTurns: a run saved before read tags existed still gets one, derived from the answer", () => {
  const [turn] = reviewTurns([{ question: { name: "Q" }, answer: "", skipped: true }]);
  assert.equal(turn?.read, "skip");
});

test("reviewExtras: one payload carrying every input, with the run's own turns", () => {
  const extras = reviewExtras(
    {
      agendaInput: { raw: "billing", summary: "Billing rewrite" },
      agendaInjected: true,
      agendaCovered: true,
      promises: [{ id: "p1", owner: "manager", action: "Name two options", when: "today", outcome: null }],
      priorCheckin: { fromSessionId: "run_a", skipped: true, outcomes: [] },
      outcomeCheck: "partly",
      briefing: { cost: { usd_total: 0.11, call_count: 6 } },
      transcript: [{ question: { name: "Q" }, answer: "A" }],
    },
    { key: "k", status: "cached" },
    { profile: { summary: "S" } },
  );
  assert.equal(extras.agenda?.injected, true);
  assert.equal(extras.priorActions?.skipped, true);
  assert.equal(extras.promises?.length, 1);
  assert.equal(extras.outcomeCheck, "partly");
  assert.equal(extras.roleProfile?.key, "k");
  assert.deepEqual(extras.cost, { usd: 0.11, calls: 6 });
  assert.equal(extras.turns.length, 1);
});

test("reviewExtras: a bare run answers null everywhere instead of empty scaffolding", () => {
  const extras = reviewExtras({}, null, null);
  assert.equal(extras.agenda, null);
  assert.equal(extras.priorActions, null);
  assert.equal(extras.promises, null);
  assert.equal(extras.roleProfile, null);
  assert.equal(extras.cost, null);
  assert.deepEqual(extras.turns, []);
});
