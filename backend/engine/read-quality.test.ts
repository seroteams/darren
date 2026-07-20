import test from "node:test";
import assert from "node:assert/strict";
import { classifyAnswer, isDecline, isLowContentNote } from "./read-quality.ts";

// The classifier is the single source of a turn's read tag. It must mirror the
// per-turn reason reviewer.computeReadQuality historically derived inline:
// skip/empty → decline → thin → note.
test("classifyAnswer — skips: skipped marker, empty, whitespace", () => {
  assert.equal(classifyAnswer("(skipped)"), "skip");
  assert.equal(classifyAnswer(""), "skip");
  assert.equal(classifyAnswer("   "), "skip");
  assert.equal(classifyAnswer(null), "skip");
  assert.equal(classifyAnswer(undefined), "skip");
});

test("classifyAnswer — declines: agenda-neutral brush-offs", () => {
  assert.equal(classifyAnswer("nothing to add"), "decline");
  assert.equal(classifyAnswer("Nothing else, really"), "decline");
  assert.equal(classifyAnswer("happy to start"), "decline");
});

test("classifyAnswer — thin: ≤2 tokens, filler, reporting-wrapper, [SHALLOW] note", () => {
  assert.equal(classifyAnswer("Not sure."), "thin"); // 2 tokens
  assert.equal(classifyAnswer("fine"), "thin"); // 1 token
  assert.equal(classifyAnswer("yeah he said things have been ok"), "thin"); // reporting wrapper, no content
  // A note the scorer flagged [SHALLOW] is thin even when the answer clears the floor.
  assert.equal(classifyAnswer("the sprint has been moving along nicely", "[SHALLOW] garbled"), "thin");
});

test("classifyAnswer — note: a real, content-bearing answer", () => {
  assert.equal(
    classifyAnswer("Honestly better than expected — the Thursday demo forces the team to prep earlier"),
    "note",
  );
  assert.equal(classifyAnswer("Wants clearer scope on the billing rewrite"), "note"); // terse but real signal
  // A concrete note is untouched by the reporting-wrapper strip.
  assert.equal(classifyAnswer("deadlines are tight this fortnight"), "note");
});

test("classifyAnswer — a bare 'nothing …' with real content is not a decline", () => {
  assert.equal(isDecline("nothing has improved since the reorg"), false);
  assert.equal(classifyAnswer("nothing has improved since the reorg"), "note");
});

test("isLowContentNote only fires when a reporting wrapper wraps empty content", () => {
  assert.equal(isLowContentNote("he said things are fine"), true); // wrapper + only low-signal words
  assert.equal(isLowContentNote("she said the migration slipped a week"), false); // wrapper + real content
  assert.equal(isLowContentNote("the migration slipped a week"), false); // no wrapper
});
