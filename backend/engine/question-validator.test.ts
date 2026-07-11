import test from "node:test";
import assert from "node:assert/strict";
import { validateQuestionBeforeShow } from "./question-validator.ts";

const SUBSTANTIVE = "Mentioned mentoring before — still wants it, but stopped pushing.";

test("the canned 'can you say more' stem stays banned on a substantive answer", () => {
  const r = validateQuestionBeforeShow({
    name: "Mentioned mentoring before — can you say more about what that means for you right now?",
    answer: SUBSTANTIVE,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "vague follow-up on substantive answer");
});

test("a quoted-mirror stem must quote the answer contiguously", () => {
  // Fabricated quote — words the report never said in that order.
  const r = validateQuestionBeforeShow({
    name: 'You said "pushing mentoring stopped" — what’s behind that for you right now?',
    answer: SUBSTANTIVE,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "mirror fragment not a contiguous quote of the answer");
});

test("a quoted-mirror stem with a real contiguous quote passes", () => {
  const r = validateQuestionBeforeShow({
    name: 'You said "Mentioned mentoring before" — what’s behind that for you right now?',
    answer: SUBSTANTIVE,
  });
  assert.equal(r.ok, true);
});
