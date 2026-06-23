#!/usr/bin/env node
// Regression: the read-quality gate must tell a manager *skip* (refusal, no note
// captured) apart from a *thin* answer (the report said ≤2 words), and trigger
// partial-read on thin note COVERAGE — so a couple of skips in an otherwise
// well-answered session no longer flips the briefing into "they barely answered".

const assert = require("node:assert/strict");
const { computeReadQuality } = require("../backend/engine/reviewer");

const note = (i) => ({
  alias: `q${i}`,
  stage: "anchor",
  answer: "She owns the payments migration and feels genuinely stretched by it.",
});
const skip = (i) => ({ alias: `q${i}`, stage: "anchor", answer: "", skipped: true });
const thin = (i) => ({ alias: `q${i}`, stage: "anchor", answer: "all good" });

// Case A — mostly skipped: 2 real notes + 4 refusals. Thin coverage → partial,
// and the reason names the refusals, not the report.
const a = computeReadQuality([note(1), note(2), skip(3), skip(4), skip(5), skip(6)]);
assert.equal(a.partial_read, true, "A: thin note coverage triggers partial_read");
assert.equal(a.partial_reason, "mostly_skipped", "A: reason is mostly_skipped");
assert.equal(a.skipped_count, 4, "A: 4 skips counted as refusals");
assert.equal(a.thin_count, 0, "A: no thin answers");

// Case B — mostly thin: 2 notes + 4 two-word answers. Partial, but framed as a
// thin read of the report's own words.
const b = computeReadQuality([note(1), note(2), thin(3), thin(4), thin(5), thin(6)]);
assert.equal(b.partial_read, true, "B: thin note coverage triggers partial_read");
assert.equal(b.partial_reason, "mostly_thin", "B: reason is mostly_thin");
assert.equal(b.thin_count, 4, "B: 4 thin answers counted");
assert.equal(b.skipped_count, 0, "B: no skips");

// Case C — the regression: a well-answered session with 2 skips must NOT flip to
// partial. 6 notes of 8 turns = 75% coverage.
const c = computeReadQuality([
  note(1), note(2), note(3), note(4), note(5), note(6), skip(7), skip(8),
]);
assert.equal(c.partial_read, false, "C: 2 skips in a well-answered session stay a firm read");
assert.equal(c.partial_reason, null, "C: no partial_reason on a firm read");
assert.equal(c.note_turns, 6, "C: 6 real notes counted");

console.log("PASS test-read-quality");
