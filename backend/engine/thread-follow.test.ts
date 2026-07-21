import test from "node:test";
import assert from "node:assert/strict";
import { buildThreadFollowQuestion, followReferencesAnswer } from "./thread-follow.ts";
import { validateQuestionBeforeShow } from "./question-validator.ts";
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

// Real substantive answers from the 2026-07-11 biweekly-priya gate roll. Every
// one passed answerHasThread and then died in the builder: the old canned
// "can you say more about what that means" stem is the exact phrase the
// validator bans on substantive answers, so the runtime mint could never fire
// on the very answers it exists for.
const REAL_ANSWERS = [
  "Mentioned mentoring before — still wants it, but stopped pushing.",
  "Proud of the migration plan and how the cutover was handled.",
  "Felt a bit stuck doing similar work for months.",
];

for (const answer of REAL_ANSWERS) {
  test(`buildThreadFollowQuestion mints a validator-passing follow for: "${answer.slice(0, 32)}…"`, () => {
    const follow = buildThreadFollowQuestion(lastQ, answer, []);
    assert.ok(follow, "builder returned null — the stem failed its own validation");
    assert.equal(follow.label, "Thread follow");
    assert.equal(follow.source, "planner_added");
    // Grounded: the stem quotes the answer's own words (this is also what the
    // gate's plan_thread_follow metric checks).
    assert.ok(
      followReferencesAnswer(answer, follow.name),
      `stem does not reference the answer: ${follow.name}`,
    );
    const check = validateQuestionBeforeShow({ name: follow.name, answer });
    assert.ok(check.ok, `validator rejected the minted stem: ${JSON.stringify(check)}`);
  });
}

test("buildThreadFollowQuestion still skips an answer with no mirrorable clause", () => {
  const follow = buildThreadFollowQuestion(lastQ, "and but so um uh and but", []);
  assert.equal(follow, null);
});

// Regression for the 2026-07-21 user test: the quoted mirror cut the first
// clause's last word off ("some issues on top of her" from "…her mind"), which
// read as a broken quote with no visible source. The whole clause must survive.
test("buildThreadFollowQuestion quotes the whole clause, never a mid-phrase cut", () => {
  const answer = "Some issues on top of her mind. PO is slowing UX down for the team.";
  const follow = buildThreadFollowQuestion(lastQ, answer, []);
  assert.ok(follow, "builder returned null on a clean, mirrorable answer");
  assert.match(
    follow.name,
    /some issues on top of her mind/i,
    `quote was truncated mid-clause: ${follow.name}`,
  );
  assert.ok(
    /her mind/i.test(follow.name),
    `last word of the clause was lopped off: ${follow.name}`,
  );
  const check = validateQuestionBeforeShow({ name: follow.name, answer });
  assert.ok(check.ok, `validator rejected the whole-clause stem: ${JSON.stringify(check)}`);
});
