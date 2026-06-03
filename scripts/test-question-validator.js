#!/usr/bin/env node
const {
  validateQuestionBeforeShow,
  FALLBACK_STEM,
} = require("../src/question-validator");

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`  FAIL  ${msg}`);
    failed += 1;
  } else {
    console.log(`  PASS  ${msg}`);
  }
}

const telegraphic =
  "Thought retry logic covered it. Missed delayed success state. Main paths passed so she felt ok to hand off.";

const badMirror = `Thought retry logic — can you say more about what that means for you right now?`;
const v = validateQuestionBeforeShow({
  name: badMirror,
  answer: telegraphic,
  transcript: [],
});
assert(!v.ok, "rejects Jun02-style mirror stem");
assert(v.fallback === FALLBACK_STEM, "fallback stem set");

const good = validateQuestionBeforeShow({
  name: "When you assumed retry logic covered it, what did you expect the system to do?",
  answer: telegraphic,
  transcript: [],
});
assert(good.ok, "accepts full-sentence assumption question");

if (failed) {
  console.error(`\n${failed} test(s) failed.\n`);
  process.exit(1);
}
console.log("\n✓ question-validator tests passed.\n");
