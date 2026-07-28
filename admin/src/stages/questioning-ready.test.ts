import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readyCardHtml,
  readyReasons,
  readyHeading,
  readyKey,
  READY_CTA,
  READY_STEP_LABEL,
  READY_NO_BRIEF,
} from "./questioning-ready.ts";

// runner-readiness: the runner opens on a walk-in gate, never straight on
// question 1. It carries the REASON to walk in (the brief's own theme and
// outcome) and one primary that starts the meeting. With no brief it says so
// instead of inventing a purpose.

// fileURLToPath, not new URL().pathname: on Windows the latter yields "/C:/..." and
// path.join then builds "C:\C:\...", so this whole file threw ENOENT before it ran a
// single assertion. Every other source-reading test here uses the same helper.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = fs.readFileSync(path.join(HERE, "questioning.js"), "utf8");

const BRIEF = {
  coreIssue: "He's outgrown the work he's given and hasn't said it out loud.",
  goodOutcome: "One area he owns end to end by the next 1:1.",
};

test("the gate quotes both brief slots, in walk-in order", () => {
  const reasons = readyReasons(BRIEF);
  assert.deepEqual(
    reasons.map((r) => r.label),
    ["Why you're walking in", "Aim to leave with"],
    "reason first, outcome second"
  );
  assert.equal(reasons[0].text, BRIEF.coreIssue, "the brief's own words, verbatim");
  assert.equal(reasons[1].text, BRIEF.goodOutcome, "the brief's own words, verbatim");
});

test("a missing slot is dropped, never padded with filler", () => {
  assert.equal(readyReasons({ coreIssue: BRIEF.coreIssue }).length, 1, "only what the brief has");
  assert.equal(readyReasons({ goodOutcome: "   " }).length, 0, "whitespace is not content");
  assert.equal(readyReasons(null).length, 0, "no brief, no reasons");
});

test("no brief: the card says so plainly and still starts the meeting", () => {
  const html = readyCardHtml({ name: "Sofia", brief: null });
  assert.ok(html.includes(READY_NO_BRIEF), "the absence is stated, not filled in");
  assert.ok(!html.includes("cp-ready__reason"), "no empty reason rows");
  assert.match(html, /js-wf-continue[^>]*>Start the meeting</, "the primary is still there");
});

test("the heading names the person, and copes without one", () => {
  assert.equal(readyHeading("Sofia"), "Ready to start with Sofia?");
  assert.equal(readyHeading("  "), "Ready to start?");
});

test("one primary, no second button: the gate is a door, not a fork", () => {
  const html = readyCardHtml({ name: "Sofia", brief: BRIEF });
  assert.equal(html.split("<button").length - 1, 1, "exactly one button");
  assert.ok(html.includes(READY_CTA), "and it starts the meeting");
});

test("brief text is escaped, so a quote in a brief can't break the card", () => {
  const html = readyCardHtml({ name: "<b>x</b>", brief: { coreIssue: "<script>bad()</script>" } });
  assert.ok(!html.includes("<script>"), "no raw markup from the payload");
  assert.ok(!html.includes("<b>x</b>"), "nor from the name");
});

test("the gate is once per 1:1, keyed per session", () => {
  assert.equal(readyKey("abc"), "sero.ready.abc");
  assert.notEqual(readyKey("abc"), readyKey("def"), "two 1:1s never share the flag");
});

test("the runner shows the gate before anything else, and only when unseen", () => {
  assert.match(HOST, /readyAlreadyShown\(store\.sessionId\)/, "the seen-flag is consulted");
  assert.match(
    HOST,
    /async function proceedBoot\(\)[\s\S]{0,320}showReadyGate\(\)[\s\S]{0,400}getPriorPromises/,
    "the gate runs before the promises check-in and before question 1"
  );
  assert.match(HOST, /markReadyShown\(store\.sessionId\)/, "starting the meeting stamps it seen");
  assert.match(HOST, /turnLabel\.textContent = READY_STEP_LABEL/, "the step reads as the walk-in moment");
  assert.equal(READY_STEP_LABEL, "Before you walk in", "and that moment is named plainly");
});
