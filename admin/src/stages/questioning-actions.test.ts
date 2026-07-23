import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actionRowHtml,
  scriptedControlsHtml,
  isSubmitShortcut,
  EXIT_LABEL,
  KBD_HINT,
} from "./questioning-actions.ts";

// Phase 4 (design-consolidation, audit F6): the interview action row is the
// shared wizard footer — ghost Back far left, quiet Skip middle-right, one
// primary far right, never more than three buttons. Scripted/dev extras live
// in the scripted meta strip, not the row. Enter is a newline; Ctrl/Cmd+Enter
// submits. The exit label never mutates mid-screen.

const countButtons = (html: string): number => html.split("<button").length - 1;

test("default row: quiet Skip then primary Submit, no Back on turn 1", () => {
  const html = actionRowHtml({});
  assert.ok(html.includes('class="wizard-footer"'), "shared wizard footer wrapper");
  assert.ok(!html.includes("js-wf-back"), "no Back on the first turn");
  assert.match(html, /class="btn btn--ghost js-skip"/, "Skip is a quiet ghost");
  assert.match(html, /js-wf-continue[^>]*>Submit answer</, "primary is Submit answer");
  assert.ok(html.indexOf("js-skip") < html.indexOf("js-wf-continue"), "Skip sits before the primary");
  assert.equal(countButtons(html), 2, "two buttons on turn 1");
});

test("mid-interview row: ghost Back far left, Skip middle, primary right, exactly 3", () => {
  const html = actionRowHtml({ canGoBack: true });
  assert.match(html, /wizard-footer__left[\s\S]*js-wf-back/, "Back in the left slot");
  assert.match(html, /class="btn btn--ghost js-wf-back"/, "Back is a ghost");
  assert.ok(html.indexOf("js-wf-back") < html.indexOf("js-skip"), "Back before Skip");
  assert.ok(html.indexOf("js-skip") < html.indexOf("js-wf-continue"), "Skip before the primary");
  assert.equal(countButtons(html), 3, "never more than three buttons");
});

test("final turn: Finish ghost replaces Skip; primary is Agree next actions", () => {
  const html = actionRowHtml({ isFinal: true, canGoBack: true });
  assert.ok(!html.includes("js-skip"), "no Skip on the final turn");
  assert.match(html, /js-finish[^>]*>Finish without next steps</, "Finish ghost present");
  assert.match(html, /js-wf-continue[^>]*>Agree next actions</, "final primary label");
  assert.equal(countButtons(html), 3, "still capped at three");
});

test("scripted lane: plain Skip kept, Back suppressed, extras NOT in the row", () => {
  const html = actionRowHtml({ scripted: true, canGoBack: true });
  assert.ok(!html.includes("js-wf-back"), "scripted lane has no Back");
  assert.ok(html.includes("js-skip"), "scripted lane keeps the plain Skip");
  assert.ok(!html.includes("js-play"), "Insert buttons are not in the action row");
  assert.equal(countButtons(html), 2, "two buttons in the scripted row");
});

test("scripted controls render for the meta strip, outside the wizard footer", () => {
  const html = scriptedControlsHtml();
  assert.ok(html.includes("js-play"), "Insert scripted answer hook");
  assert.ok(html.includes("js-play-submit"), "Insert and submit hook");
  assert.ok(!html.includes("wizard-footer"), "not wizard footer markup");
});

test("Ctrl/Cmd+Enter submits; plain Enter and Shift+Enter stay newlines", () => {
  assert.equal(isSubmitShortcut({ key: "Enter", ctrlKey: true }), true, "Ctrl+Enter");
  assert.equal(isSubmitShortcut({ key: "Enter", metaKey: true }), true, "Cmd+Enter");
  assert.equal(isSubmitShortcut({ key: "Enter" }), false, "plain Enter is a newline");
  assert.equal(isSubmitShortcut({ key: "Enter", shiftKey: true } as never), false, "Shift+Enter is a newline");
  assert.equal(isSubmitShortcut({ key: "a", ctrlKey: true }), false, "Ctrl+A is not submit");
  assert.equal(isSubmitShortcut({ key: "Escape" }), false, "Esc does nothing");
});

test("one stable exit label; the kbd hint drops Esc and teaches the power submit", () => {
  assert.equal(EXIT_LABEL, "Wrap up early", "exit label never mutates");
  assert.match(KBD_HINT, /Ctrl\+Enter/, "hint teaches Ctrl+Enter");
  assert.match(KBD_HINT, /Cmd\+Enter/, "hint covers Mac");
  assert.ok(!/esc/i.test(KBD_HINT), "no Esc in the hint");
});
