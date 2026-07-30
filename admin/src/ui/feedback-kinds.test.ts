import { test } from "node:test";
import assert from "node:assert/strict";
import { noteKind, FEEDBACK_KINDS } from "./feedback-kinds.ts";

// The inbox types every row from its data — a verdict tap carries a runId/verdict,
// a plain Send-feedback note carries neither. The kind map is the extension point:
// a future kind adds one entry there, no renderer surgery.

test("noteKind: a briefing verdict tap is 'verdict'", () => {
  assert.equal(noteKind({ runId: "run-1", verdict: "yes" }), "verdict");
  assert.equal(noteKind({ runId: "run-2", verdict: "no" }), "verdict");
});

test("noteKind: a plain note (no run link) is 'note'", () => {
  assert.equal(noteKind({}), "note");
  assert.equal(noteKind({ runId: null, verdict: null }), "note");
});

test("noteKind: a run link alone is enough. A half-set legacy row still types as verdict", () => {
  assert.equal(noteKind({ runId: "run-3" }), "verdict");
  assert.equal(noteKind({ verdict: "yes" }), "verdict");
});

test("every kind carries a label for the Type cell", () => {
  for (const kind of ["note", "verdict", "brief"] as const) {
    assert.ok(FEEDBACK_KINDS[kind].label.length > 0);
  }
});

// --- brief-star-rating: the prep brief's out-of-5 tap ----------------------
// A brief rating carries a run link TOO, so the score has to be checked first
// or every rating would show up in the inbox as a 1:1 verdict.

test("noteKind: a row carrying a score is 'brief'", () => {
  assert.equal(noteKind({ runId: "run-1", stars: 4 }), "brief");
  assert.equal(noteKind({ runId: "run-2", stars: 1 }), "brief");
});

test("noteKind: the score wins over the run link, so a rating never reads as a verdict", () => {
  assert.equal(noteKind({ runId: "run-1", verdict: null, stars: 5 }), "brief");
});

test("noteKind: a verdict row with no score still types as verdict", () => {
  assert.equal(noteKind({ runId: "run-1", verdict: "yes", stars: null }), "verdict");
});

test("noteKind: a plain note with a null score is still a note", () => {
  assert.equal(noteKind({ stars: null }), "note");
});
