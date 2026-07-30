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

// No dead wires P4: the strip was built for the QA era, when mid-run notes were
// tester observations. Real managers now use the notes panel for genuine
// observations, so a REAL run passes its notes through to the evaluation, and
// only QA runs (a runLabel or scripted mode) keep the strip.
test("formatCapturedNotes: a real manual run passes mid-run notes through", () => {
  const notes = [{ text: "He keeps glancing at his phone, seems flat.", ts: 0 }];
  const out = formatCapturedNotes({ notes, mode: "manual", runLabel: null });
  assert.ok(out.includes("glancing at his phone"), "a real manager note must reach the evaluation");
});

test("formatCapturedNotes: a QA-labelled run still strips stamped tester lines", () => {
  const notes = [{ text: "this question is repeated a lot", question_alias: "q_repeat", ts: 0 }];
  assert.equal(formatCapturedNotes({ notes, mode: "manual", runLabel: "qa-sweep" }), "");
  assert.equal(formatCapturedNotes({ notes, mode: "scripted", runLabel: null }), "");
});

test("formatCapturedNotes: no notes is an empty string on every lane", () => {
  assert.equal(formatCapturedNotes({ notes: [], mode: "manual", runLabel: null }), "");
  assert.equal(formatCapturedNotes({ notes: undefined, mode: "scripted", runLabel: "x" }), "");
});
