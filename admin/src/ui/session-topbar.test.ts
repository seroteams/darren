import { test } from "node:test";
import assert from "node:assert/strict";
import { stepperVisible } from "./session-topbar.js";

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
  for (const stage of ["START", "RUNS", "LOGIN", "ERROR", "GALLERY", "", undefined]) {
    assert.equal(stepperVisible(stage as string, null), false, `${stage || "(empty)"} has no stepper`);
  }
});

test("the Phrase library is in-run only with a live session", () => {
  assert.equal(stepperVisible("LEXICON_REVIEW", "s-123"), true, "mid-run visit keeps the bar");
  assert.equal(stepperVisible("LEXICON_REVIEW", null), false, "standalone tool stays bare");
});
