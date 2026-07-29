import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stepperVisible, exitVisible, EXIT_LABEL } from "./session-topbar.js";

const topbarJs = readFileSync(new URL("./session-topbar.js", import.meta.url), "utf8");

// F1 (design audit, flow-level finding 1): the 7-step stepper is the flow's
// constant spine, visible from the very first Setup question. INTAKE used to be
// carved out ("pre-run: no stage breadcrumb") — that carve-out is gone.

test("the stepper shows on Setup (INTAKE), even before a session exists", () => {
  assert.equal(stepperVisible("INTAKE", null), true, "no session id yet: still shown");
  assert.equal(stepperVisible("INTAKE", "s-123"), true, "resumed setup: still shown");
});

test("every run stage keeps the stepper, Setup through Recap plus the review", () => {
  for (const stage of ["INTAKE", "FOCUS_POINTS", "PREPARATION", "BANK", "QUESTIONING", "EVAL", "BRIEFING", "RUN_DEBRIEF"]) {
    assert.equal(stepperVisible(stage, "s-123"), true, `${stage} shows the stepper`);
  }
});

test("standalone screens stay single-bar: no stepper outside the run", () => {
  for (const stage of ["START", "RUNS", "LOGIN", "ERROR", "DESIGN", "", undefined]) {
    assert.equal(stepperVisible(stage as string, null), false, `${stage || "(empty)"} has no stepper`);
  }
});

test("the Phrase library is in-run only with a live session", () => {
  assert.equal(stepperVisible("LEXICON_REVIEW", "s-123"), true, "mid-run visit keeps the bar");
  assert.equal(stepperVisible("LEXICON_REVIEW", null), false, "standalone tool stays bare");
});

// The way out of a 1:1 (Carl, 2026-07-27: "i cant get out of a 1:1 when it's like
// this"). The run lane hides the nav rail, so the topbar is the only chrome, and
// the exit lived inside a popover behind a button labelled "New 1:1" — a label
// nobody reads as a menu. It is a plain visible button now; the popover keeps its
// copy plus the destructive Delete.

test("the exit shows on every run stage that has a live session", () => {
  for (const stage of ["FOCUS_POINTS", "PREPARATION", "BANK", "QUESTIONING", "EVAL", "BRIEFING"]) {
    assert.equal(exitVisible(stage, "s-123"), true, `${stage} offers a way out`);
  }
});

test("no live session, no exit: Setup keeps its own Discard", () => {
  assert.equal(exitVisible("INTAKE", null), false, "nothing to save yet");
  assert.equal(exitVisible("INTAKE", "s-123"), true, "a resumed Setup can be left");
  assert.equal(exitVisible("START", "s-123"), false, "outside the run the rail is the way out");
});

test("the exit is a visible control, not a hidden menu item", () => {
  assert.equal(EXIT_LABEL, "Save and exit", "the label says what happens");
  assert.ok(topbarJs.includes("js-topbar-exit"), "the visible button carries its own hook");
  assert.ok(
    topbarJs.indexOf("js-topbar-exit") < topbarJs.indexOf("function openPopover"),
    "it is built with the bar itself, not inside the popover",
  );
});
