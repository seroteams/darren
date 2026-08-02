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

const turn = (n: number, answer: string, nextQuestionName: string, note?: string) => ({
  turn: n,
  answer,
  question: { name: nextQuestionName },
  ...(note === undefined ? {} : { note }),
});

// A session is read in pairs: turn N's answer, then turn N+1's question.
const pair = (answer: string, nextQuestion: string, note?: string) => [
  { turn: 1, answer, question: { name: "opening question" }, ...(note === undefined ? {} : { note }) },
  { turn: 2, answer: "a follow-up answer with enough words to be substantive", question: { name: nextQuestion } },
  { turn: 3, answer: "and a third so neither pair is the closer", question: { name: "and a closing question" } },
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

test("the closer is exempt", () => {
  // THE TRIGGER yields to the closer. A snag named on the second-to-last turn is
  // followed by the closer by design, and that is not a miss.
  assert.deepEqual(
    runAgencyFollowGate([
      { turn: 1, answer: "opening answer with enough words to count", question: { name: "how are things?" } },
      {
        turn: 2,
        answer: "the beta date keeps slipping and the two squads both think the other owns it",
        question: { name: "and how has the month been overall?" },
      },
      { turn: 3, answer: "final answer", question: { name: "Given what we covered, where do you want to focus first?" } },
    ]),
    [],
  );
});

test("skipped turns are not read as snags", () => {
  assert.deepEqual(
    runAgencyFollowGate([
      { turn: 1, answer: "the rollout is blocked and has been for three weeks", skipped: true, question: { name: "q1" } },
      { turn: 2, answer: "a substantive answer here", question: { name: "What is on your plate?" } },
      { turn: 3, answer: "another one", question: { name: "And after that?" } },
    ]),
    [],
  );
});

test("every unanswered snag in a session is counted, not just the first", () => {
  const fails = runAgencyFollowGate([
    { turn: 1, answer: "the billing rewrite is going sideways and has been for a while", question: { name: "q1" } },
    { turn: 2, answer: "the handover between the squads keeps dropping things", question: { name: "What is next for the roadmap?" } },
    { turn: 3, answer: "recruitment has stalled since March and nobody has picked it up", question: { name: "How is the new starter settling in?" } },
    { turn: 4, answer: "a fourth substantive answer", question: { name: "And what about the roadmap?" } },
    { turn: 5, answer: "final answer", question: { name: "Where do you want to focus first?" } },
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
    ]),
    // A snag followed by a turn with no question recorded still flags: unverifiable
    // is not clean, the same call the wellbeing gate makes.
    [
      'turn 1 named a snag and the next question did not ask what they did about it: "the release is stuck behind an unowned dependency"',
    ],
  );
});
