import test from "node:test";
import assert from "node:assert/strict";
import { markThreadFollow, followReferencesAnswer, isFollowUpQuestion } from "./thread-follow.ts";
import type { Question } from "../shared/question.types.ts";

const lastQ = {
  alias: "q_friction_scan_34",
  label: "Friction scan",
  name: "Where has work felt messier or more draggy than expected?",
  purpose: "topic",
  stage: "explore",
  axis_effects: { engagement: 1 },
  source: "reworded_from:q_friction_scan_34",
} as unknown as Question;

function planned(name: string, extra: Partial<Question> = {}): Question {
  return {
    alias: "q_planner_item",
    label: "Planner item",
    name,
    description: "",
    purpose: "topic",
    stage: "explore",
    axis_effects: { clarity: 1 },
    source: "planner_added",
    ...extra,
  } as Question;
}

// Real substantive answers from the 2026-07-11 biweekly-priya gate roll.
const REAL_ANSWERS = [
  "Mentioned mentoring before — still wants it, but stopped pushing.",
  "Proud of the migration plan and how the cutover was handled.",
  "Felt a bit stuck doing similar work for months.",
];

// The engine no longer writes the follow-up. Until 2026-07-30 it minted one fixed
// sentence in code (`You said "…" — what's behind that for you right now?`), which
// read as bland on every turn it fired and could slice a quote mid-word. These
// tests pin the replacement: mark what the model did, never author a question.

for (const answer of REAL_ANSWERS) {
  test(`no question is invented when the planner drops the thread: "${answer.slice(0, 32)}…"`, () => {
    const queue = [planned("What's on for the rest of the quarter?")];
    const issues: string[] = [];
    markThreadFollow({ newQueue: queue, lastAnswer: answer, lastQuestion: lastQ, remainingBudget: 6, issues });
    assert.equal(queue.length, 1, "queue membership changed — the engine authored a question again");
    assert.equal(queue[0]?.follows_thread, undefined);
    assert.ok(
      issues.some((i) => /dropped the open thread/.test(i)),
      `expected the dropped-thread note, got: ${JSON.stringify(issues)}`,
    );
  });
}

test("the planner's own follow-up is tagged, not replaced", () => {
  const answer = "the test environment kept falling over and we lost a week";
  const modelFollow = planned("What did you try when the test environment went down?");
  assert.ok(followReferencesAnswer(answer, modelFollow.name), "fixture must reference the answer");
  const queue = [modelFollow, planned("Where's the quarter heading?")];
  const issues: string[] = [];
  markThreadFollow({ newQueue: queue, lastAnswer: answer, lastQuestion: lastQ, remainingBudget: 6, issues });
  assert.equal(queue.length, 2, "queue membership changed");
  assert.equal(queue[0]?.follows_thread, true);
  assert.deepEqual(issues, [], `expected no issue when the planner followed the thread: ${JSON.stringify(issues)}`);
});

test("no note and no tag in wind-down, so the arc can reach the closer", () => {
  const queue = [planned("What's on for the rest of the quarter?")];
  const issues: string[] = [];
  markThreadFollow({
    newQueue: queue,
    lastAnswer: "the test environment kept falling over and we lost a week",
    lastQuestion: lastQ,
    remainingBudget: 2,
    issues,
  });
  assert.equal(queue[0]?.follows_thread, undefined);
  assert.deepEqual(issues, []);
});

test("a follow-up is never chased with another follow-up", () => {
  const queue = [planned("What's on for the rest of the quarter?")];
  const issues: string[] = [];
  markThreadFollow({
    newQueue: queue,
    lastAnswer: "the test environment kept falling over and we lost a week",
    lastQuestion: planned("What did you try when the test environment went down?", { follows_thread: true }),
    remainingBudget: 6,
    issues,
  });
  assert.deepEqual(issues, [], "chained a second follow-up onto a follow-up");
});

test("a shallow or skipped answer opens no thread", () => {
  for (const answer of ["ok", "(skipped)", "", "fine"]) {
    const queue = [planned("What's on for the rest of the quarter?")];
    const issues: string[] = [];
    markThreadFollow({ newQueue: queue, lastAnswer: answer, lastQuestion: lastQ, remainingBudget: 6, issues });
    assert.deepEqual(issues, [], `treated "${answer}" as an open thread`);
    assert.equal(queue[0]?.follows_thread, undefined);
  }
});

// Sessions recorded before 2026-07-30 still carry code-minted follow-ups. The
// drill cap pins them by this check, so replay must keep recognising them.
test("a pre-2026-07-30 code-minted follow-up is still recognised as a follow-up", () => {
  assert.equal(
    isFollowUpQuestion({ source: "planner_added", label: "Thread follow" } as Question),
    true,
  );
  assert.equal(isFollowUpQuestion(planned("Where's the quarter heading?")), false);
  assert.equal(isFollowUpQuestion(null), false);
});
