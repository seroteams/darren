// AGENCY_NOT_ASKED (sharper-questions P2).
//
// Machar's one substantive criticism was that the sharp question landed on the
// summary page instead of in the room (docs/validation/machar-2026-07-29.md, F1).
// The prompt rule that fixes it (plan-turn.md <question_craft> THE TRIGGER) shipped
// on 29 July, fired on 2 turns that same day, and never fired again, because nothing
// anywhere asserted that it should. This is that assertion.
//
// Detect-only, like every sibling gate: it flags so the prompt gets fixed, and never
// edits a question or a score. These tests pin the line between "they named a snag
// and were asked what they did about it" and "they named a snag and we changed the
// subject".

import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgencyFollowGate } from "./golden-checks.ts";

// A session is read in pairs: turn N's answer, then turn N+1's question. Sessions here are
// six turns so the snag at turn 1 sits well inside the window: wind-down starts at
// remaining_budget <= 2, so only turns 1 to 3 of a 6-turn session can carry an agency ask.
const pair = (answer: string, nextQuestion: string, note?: string) => [
  { turn: 1, answer, question: { name: "opening question" }, ...(note === undefined ? {} : { note }) },
  { turn: 2, answer: "a follow-up answer with enough words to be substantive", question: { name: nextQuestion } },
  { turn: 3, answer: "a third answer, everything moving along nicely", question: { name: "and what else is on?" } },
  { turn: 4, answer: "a fourth answer, also perfectly clear", question: { name: "how is the team finding it?" } },
  { turn: 5, answer: "a fifth answer with nothing snagged", question: { name: "anything you want from me?" } },
  { turn: 6, answer: "a final answer", question: { name: "where do you want to focus first?" } },
];

test("a named snag followed by a new topic is flagged", () => {
  const fails = runAgencyFollowGate(
    pair(
      "mentioned mentoring before, still wants it, but stopped pushing",
      "What do you expect to own next quarter that you do not own today?",
    ),
  );
  assert.equal(fails.length, 1);
  assert.match(fails[0]!, /turn 1/);
  assert.match(fails[0]!, /named a snag/);
});

test("a named snag followed by an agency question is clean", () => {
  for (const nextQuestion of [
    "What have you tried so far, and what happened?",
    "What did you do the last time it dropped something?",
    "Who have you spoken to about it, and who's next?",
    "What would you change to hold the date, and what would it cost?",
    "What will you do about the mentoring scheme this month?",
    "Where would you start if you picked it back up?",
  ]) {
    assert.deepEqual(
      runAgencyFollowGate(pair("the billing rewrite is stuck and nobody owns the cutover", nextQuestion)),
      [],
      `wrongly flagged a real agency follow-up: "${nextQuestion}"`,
    );
  }
});

test("an [AGENCY] marker over a description question is flagged, and says so", () => {
  // The marker is what run-health counts, and it is self-certified. Real case:
  // run 2026_Jul29_23-54 tagged [AGENCY] and then asked "What has made design reviews
  // feel messy?". A rule reporting itself as fired while not firing is worse than one
  // that plainly did not fire, so the gate grades the question and names the mismatch.
  const fails = runAgencyFollowGate(
    pair(
      "the handover keeps dropping things and it has been unclear for weeks",
      "So where does that leave the release?",
      "clarity fell on a named blocker [AGENCY]",
    ),
  );
  assert.equal(fails.length, 1);
  assert.match(fails[0]!, /note claims \[AGENCY\]/);
});

test("a real agency question is clean whether or not the marker is there", () => {
  assert.deepEqual(
    runAgencyFollowGate(
      pair(
        "the handover keeps dropping things and it has been unclear for weeks",
        "What did you do the last time it dropped something?",
      ),
    ),
    [],
  );
});

test("an answer with no snag in it is none of this gate's business", () => {
  for (const answer of [
    "really enjoying the new squad, the pace suits him",
    "took a proper week off and came back sharper",
    "wants to move toward more architecture work over the next year",
  ]) {
    assert.deepEqual(
      runAgencyFollowGate(pair(answer, "What would that look like in practice?")),
      [],
      `wrongly flagged an answer with no snag: "${answer}"`,
    );
  }
});

test("thin answers cannot name a snag", () => {
  // Under five words. THIN_INPUT_CAUTION applies here exactly as it does to scoring:
  // "stuck" on its own is not a snag on the table, it is a word.
  assert.deepEqual(runAgencyFollowGate(pair("stuck", "What are you working on?")), []);
  assert.deepEqual(runAgencyFollowGate(pair("bit unclear", "What are you working on?")), []);
});

test("a snag named inside wind-down is exempt", () => {
  // The case that made this rule: the paid gate run on 2026-08-02 flagged biweekly-priya
  // turn 4 of 6, where the planner had noted [BUDGET-STARVED] and handed the slot to the
  // arc's remaining stages. Wind-down applies at remaining_budget <= 2 and outranks THE
  // TRIGGER, so turns 4, 5 and 6 of a 6-turn session cannot carry the agency ask and the
  // gate must not report rule-following behaviour as a miss.
  const late = [
    { turn: 1, answer: "opening answer with enough words to count", question: { name: "how are things?" } },
    { turn: 2, answer: "a second answer, nothing snagged in it", question: { name: "what are you working on?" } },
    { turn: 3, answer: "a third answer, all clear", question: { name: "and next quarter?" } },
    {
      turn: 4,
      answer: "mentioned mentoring before, still wants it, but stopped pushing",
      question: { name: "What are you actually focused on this week?" },
      note: "named an unadvanced mentoring thread [BUDGET-STARVED]",
    },
    { turn: 5, answer: "a fifth answer", question: { name: "anything from me?" } },
    { turn: 6, answer: "a final answer", question: { name: "where do you want to focus first?" } },
  ];
  assert.deepEqual(runAgencyFollowGate(late), []);
  // Move the same snag to turn 2, inside the window, and it flags.
  const early = late.map((t, i) => (i === 1 ? { ...t, answer: late[3]!.answer } : t));
  assert.equal(runAgencyFollowGate(early).length, 1);
});

test("skipped turns are not read as snags", () => {
  assert.deepEqual(
    runAgencyFollowGate([
      { turn: 1, answer: "the rollout is blocked and has been for three weeks", skipped: true, question: { name: "q1" } },
      { turn: 2, answer: "a substantive answer here", question: { name: "What is on your plate?" } },
      { turn: 3, answer: "another one", question: { name: "And after that?" } },
      { turn: 4, answer: "and another", question: { name: "And then?" } },
      { turn: 5, answer: "final answer", question: { name: "Where do you want to focus first?" } },
    ]),
    [],
  );
});

test("every unanswered snag inside the window is counted, not just the first", () => {
  const fails = runAgencyFollowGate([
    { turn: 1, answer: "the billing rewrite is going sideways and has been for a while", question: { name: "q1" } },
    { turn: 2, answer: "the handover between the squads keeps dropping things", question: { name: "What is next for the roadmap?" } },
    { turn: 3, answer: "recruitment has stalled since March and nobody has picked it up", question: { name: "How is the new starter settling in?" } },
    { turn: 4, answer: "a fourth substantive answer", question: { name: "And what about the roadmap?" } },
    { turn: 5, answer: "a fifth substantive answer", question: { name: "Anything from me?" } },
    { turn: 6, answer: "final answer", question: { name: "Where do you want to focus first?" } },
    { turn: 7, answer: "a seventh so turn 3 is still inside the window", question: { name: "last one" } },
  ]);
  assert.equal(fails.length, 3);
});

test("null-safe on missing transcript, turns and fields", () => {
  assert.deepEqual(runAgencyFollowGate(null), []);
  assert.deepEqual(runAgencyFollowGate(undefined), []);
  assert.deepEqual(runAgencyFollowGate([]), []);
  assert.deepEqual(runAgencyFollowGate([{}]), []);
  assert.deepEqual(runAgencyFollowGate([{}, {}, {}]), []);
  assert.deepEqual(
    runAgencyFollowGate([
      { turn: 1, answer: "the release is stuck behind an unowned dependency" },
      { turn: 2 },
      { turn: 3 },
      { turn: 4 },
      { turn: 5 },
    ]),
    // A snag followed by a turn with no question recorded still flags: unverifiable
    // is not clean, the same call the wellbeing gate makes.
    [
      'turn 1 named a snag and the next question did not ask what they did about it: "the release is stuck behind an unowned dependency"',
    ],
  );
});
