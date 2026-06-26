#!/usr/bin/env node
// Offline checks for answer-suggester post-filter (no API key).

const {
  sanitizeAnswer,
  filterAnswers,
  referencesFirstPerson,
  wordCount,
  MIN_WORDS,
  MAX_WORDS,
} = require("../backend/engine/answer-suggester.ts");

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

const good =
  "Backend handoffs with the app team still fuzzy — owns edge cases only after ship.";
assert(sanitizeAnswer(good) === good, "accepts 8–22 word grounded note");

const long =
  "Yeah — wants to talk about how the backend work has been landing with the app team, especially around handoffs and who owns the edge cases after ship and what comes next quarter.";
assert(sanitizeAnswer(long) === null, "rejects overlong monologue");

const short = "Yeah fine ok";
assert(sanitizeAnswer(short) === null, "rejects shallow filler");

const stripped = sanitizeAnswer(
  "Yeah — payment flow and retry are solid; curious where you see execution gaps."
);
assert(
  stripped && wordCount(stripped) >= MIN_WORDS && wordCount(stripped) <= MAX_WORDS,
  "strips banned opener and keeps substance"
);

const filtered = filterAnswers([
  good,
  long,
  short,
  "Downstream folks still surprised on delayed-success cases — want to fix that.",
]);
assert(filtered.length === 2, "filterAnswers keeps valid rows only");

assert(MIN_WORDS === 5 && MAX_WORDS === 28, "word bounds unchanged");

// First-person rejection — answers are the manager's third-person shorthand
// notes, NOT the report self-reporting. A first-person pronoun means the model
// slipped back into the report's voice and must be rejected.
const noteThirdPerson =
  "Shares once the main idea is there, but before checking the full flow.";
assert(!referencesFirstPerson(noteThirdPerson), "third-person note passes the lint");
assert(sanitizeAnswer(noteThirdPerson) === noteThirdPerson, "accepts third-person note");

const firstPersonSelf =
  "I share once the main idea is there, before I check the full flow and rationale.";
assert(referencesFirstPerson(firstPersonSelf), "detects first-person self-reference");
assert(sanitizeAnswer(firstPersonSelf) === null, "rejects first-person self-reference");

const firstPersonPlan =
  "I'd ask her to use a short readiness check before review: brief, flows, edge cases.";
assert(referencesFirstPerson(firstPersonPlan), "detects first-person manager plan ('I'd ask')");
assert(sanitizeAnswer(firstPersonPlan) === null, "rejects first-person manager plan");

const lintFiltered = filterAnswers([firstPersonSelf, firstPersonPlan, noteThirdPerson]);
assert(
  lintFiltered.length === 1 && lintFiltered[0] === noteThirdPerson,
  "filterAnswers drops first-person rows, keeps the third-person note"
);

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll answer-suggest shape checks passed.");
