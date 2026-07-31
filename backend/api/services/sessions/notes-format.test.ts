import { test } from "node:test";
import assert from "node:assert/strict";
import { stripTesterNoteLines, formatNotesForEvaluation, formatCapturedNotes } from "./notes-format.ts";

// run-qa-fixes C1: mid-run captured notes are stamped `[HH:MM @ alias]` and must not
// reach the manager-notes channel; genuine intake notes (free text) must survive.

test("stripTesterNoteLines removes timestamped tester lines", () => {
  const input = "[14:26 @ q_repeat] this question is repeated a lot\n[14:31] asked twice again";
  assert.equal(stripTesterNoteLines(input), "");
});

test("stripTesterNoteLines keeps a genuine multi-line intake note untouched", () => {
  const note = "on my mind: growth\nBB has hurting legs as he is growing";
  assert.equal(stripTesterNoteLines(note), note);
});

test("stripTesterNoteLines keeps real notes but drops interleaved tester lines", () => {
  const input = "on my mind: growth\n[14:26 @ q_repeat] repeated a lot\nwants more ownership";
  assert.equal(stripTesterNoteLines(input), "on my mind: growth\nwants more ownership");
});

test("stripTesterNoteLines handles the HH:MM:SS stamp form too", () => {
  assert.equal(stripTesterNoteLines("[09:05:12] tester line"), "");
});

test("the captured-notes formatter still stamps lines (what we then strip)", () => {
  const out = formatNotesForEvaluation([{ text: "repeated", question_alias: "q_x", ts: 0 }]);
  assert.match(out, /^\[\d{2}:\d{2} @ q_x\]/);
  assert.equal(stripTesterNoteLines(out), ""); // and the strip removes it
});

// Notes are admin-only QA (Carl, 2026-07-31): "the notes should not affect any
// questions or prompts or anything." No-dead-wires P4 let them through to the
// evaluation on a non-QA run; that is reverted. The strip has no exceptions.
test("formatCapturedNotes: a stamped mid-run note never reaches an evaluation", () => {
  const notes = [{ text: "He keeps glancing at his phone, seems flat.", question_alias: "q_x", ts: 0 }];
  assert.equal(formatCapturedNotes(notes), "", "an admin's QA note is not engine input");
});

test("formatCapturedNotes: no lane argument exists to re-open the channel", () => {
  // The old signature took { notes, mode, runLabel } and passed notes through on
  // a real run. If that carve-out ever comes back this call starts failing.
  assert.equal(formatCapturedNotes.length, 1, "formatCapturedNotes takes notes and nothing else");
});

test("formatCapturedNotes: no notes is an empty string", () => {
  assert.equal(formatCapturedNotes([]), "");
  assert.equal(formatCapturedNotes(undefined), "");
});
