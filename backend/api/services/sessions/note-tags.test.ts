import { test } from "node:test";
import assert from "node:assert/strict";
import { stripEngineTags } from "./note-tags.ts";

// user-test-fixes P1 (Machar, 2026-07-29): the planner's contract markers
// ([THREAD-DEFERRED-WINDDOWN], [SHALLOW], ...) leaked into the live-scores
// explanation on screen. They are stripped at the stream boundary only — the
// stored turnEntry.note stays raw because delta-gates/read-quality parse them.

test("strips a trailing tag and its separator, keeping the full stop", () => {
  const note =
    "He named delivery stress, which signals mild drag on engagement and wellbeing; [THREAD-DEFERRED-WINDDOWN].";
  assert.equal(
    stripEngineTags(note),
    "He named delivery stress, which signals mild drag on engagement and wellbeing."
  );
});

test("strips a leading tag", () => {
  assert.equal(stripEngineTags("[SHALLOW] One-word answer, nothing to score."), "One-word answer, nothing to score.");
});

test("strips several tags in one note", () => {
  assert.equal(
    stripEngineTags("[SHALLOW] Short answer. [BUDGET-STARVED]"),
    "Short answer."
  );
});

test("a tag-only note becomes empty (caller then skips the write)", () => {
  assert.equal(stripEngineTags("[NO-REPORT-SIGNAL]"), "");
  assert.equal(stripEngineTags("[THREAD-DEFERRED]."), "");
});

test("plain sentences pass through untouched", () => {
  const note = "He gave a concrete rationale for prioritising the beta test.";
  assert.equal(stripEngineTags(note), note);
});

test("lowercase or mixed-case brackets are not engine tags and survive", () => {
  const note = 'He said the plan was "done [sic] by Friday".';
  assert.equal(stripEngineTags(note), note);
});

test("a mid-sentence tag collapses to a single space", () => {
  assert.equal(
    stripEngineTags("Kept the thread [THREAD-DEFERRED] for the wrap-up."),
    "Kept the thread for the wrap-up."
  );
});
