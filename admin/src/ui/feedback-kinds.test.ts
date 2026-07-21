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
  for (const kind of ["note", "verdict"] as const) {
    assert.ok(FEEDBACK_KINDS[kind].label.length > 0);
  }
});
