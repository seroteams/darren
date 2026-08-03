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
  reviewActionsLabel,
  offerActionsFor,
  FEELS_OFF_LABEL,
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

test("with nothing open, the gate is still a door: one button", () => {
  const html = readyCardHtml({ name: "Sofia", brief: BRIEF });
  assert.equal(html.split("<button").length - 1, 1, "exactly one button");
  assert.ok(html.includes(READY_CTA), "and it starts the meeting");
  assert.equal(readyCardHtml({ name: "Sofia", brief: BRIEF, openActions: 0 }), html, "0 renders the same card");
});

// action-review-placement P1: last time's actions are OFFERED here, never forced
// ahead of question 1. The primary always starts the meeting; the review is the
// quiet second control, and choosing it is the only way to reach the check-in.
test("with actions open, the gate offers them without taking the primary", () => {
  const html = readyCardHtml({ name: "Sofia", brief: BRIEF, openActions: 2 });
  assert.equal(html.split("<button").length - 1, 2, "the offer, and the door");
  assert.match(html, /js-wf-continue[^>]*>Start the meeting</, "the primary still starts the meeting");
  assert.ok(html.includes("js-review-actions"), "the offer is its own hook");
  assert.ok(html.includes(reviewActionsLabel(2)), "and says how many are waiting");
});

test("the offer counts in plain words, singular and plural", () => {
  assert.equal(reviewActionsLabel(1), "Check off last time's one thing first");
  assert.equal(reviewActionsLabel(3), "Check off last time's 3 things first");
  assert.equal(reviewActionsLabel(0), "", "nothing open, nothing to say");
  assert.equal(reviewActionsLabel(-1), "", "a nonsense count is not an offer");
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

// action-review-placement P2: actions follow the PERSON, not the meeting type, so
// a "Something feels off" 1:1 can inherit a ledger from a career conversation. That
// arc, and only that arc, never meets them at the open.
test("every arc offers the review except the one that must not open on a ledger", () => {
  const others = ["Bi-weekly check-in", "Performance & feedback", "Growth & career plan", "Onboarding check-in"];
  for (const arc of others) {
    assert.equal(offerActionsFor(arc, 3), true, `${arc} offers it`);
    assert.equal(offerActionsFor(arc, 0), false, `${arc} with nothing open offers nothing`);
  }
  assert.equal(offerActionsFor(FEELS_OFF_LABEL, 3), false, "feels-off never offers it at the open");
  assert.equal(offerActionsFor(FEELS_OFF_LABEL, 0), false);
  assert.equal(offerActionsFor("  something feels off  ", 3), false, "matched on the label, not on spacing or case");
  assert.equal(offerActionsFor(null, 3), true, "an unknown arc keeps the default behaviour");
});

test("both hosts ask the arc before showing the offer", () => {
  const BANK = fs.readFileSync(path.join(HERE, "bank.js"), "utf8");
  for (const [name, src] of [["questioning.js", HOST], ["bank.js", BANK]] as const) {
    assert.match(src, /offerActionsFor\(store\.ctx\?\.meetingType/, `${name} consults the arc`);
  }
});

test("the runner shows the gate before anything else, and only when unseen", () => {
  assert.match(HOST, /readyAlreadyShown\(store\.sessionId\)/, "the seen-flag is consulted");
  assert.match(HOST, /markReadyShown\(store\.sessionId\)/, "starting the meeting stamps it seen");
  assert.match(HOST, /turnLabel\.textContent = READY_STEP_LABEL/, "the step reads as the walk-in moment");
  assert.equal(READY_STEP_LABEL, "Before you walk in", "and that moment is named plainly");
});

// The order flipped in action-review-placement P1: the open actions are read
// BEFORE the gate, because the gate is where they are offered. The check-in is
// then only reachable through that offer — never ahead of question 1 by default.
test("the runner reads what's open before the gate, and only shows the check-in on request", () => {
  assert.match(
    HOST,
    // The window widened in last-one-to-one P3: the glance is read in the same
    // Promise.all, so there is more between proceedBoot and the gate than there
    // was. The ORDER is what this guards, and it is unchanged.
    /async function proceedBoot\(\)[\s\S]{0,600}loadPriorActions\([\s\S]{0,600}showReadyGate\(/,
    "what's open is known before the gate renders"
  );
  assert.match(
    HOST,
    /showPromiseCheckin\(prior\)[\s\S]{0,200}\n\s*\}\n\s*showNextQuestion\(\)/,
    "the check-in is the branch, the questions are the default"
  );
  assert.ok(
    !/showReadyGate\(\)[\s\S]{0,200}getPriorPromises/.test(HOST),
    "the old gate-then-fetch order is gone"
  );
});

// last-one-to-one P3. The two hosts of the coach header are copies of one another,
// so the glance has to be wired in BOTH or the panel repaints on hand-over. Source
// checks rather than DOM ones, for the same reason the arc check above is: what
// matters is that neither host was left behind.
test("both hosts read the glance and hand it to the panel", () => {
  const BANK = fs.readFileSync(path.join(HERE, "bank.js"), "utf8");
  for (const [name, src] of [["questioning.js", HOST], ["bank.js", BANK]] as const) {
    // Both go through the guarded read, never the bare endpoint: that module is
    // what makes a failure or a hang end at "no glance" instead of an empty
    // walk-in card (prior-recap-read.test.ts holds it to that).
    assert.match(src, /loadPriorRecap\(store\.sessionId\)/, `${name} reads the glance`);
    assert.doesNotMatch(src, /getPriorRecap\(/, `${name} does not call the endpoint unguarded`);
    assert.match(src, /showGlance\(recap\)/, `${name} hands it to the panel`);
    assert.match(src, /segmentOneLabel\(true\)/, `${name} renames the first segment`);
  }
});

test("only the runner stands the glance down, and it does it at question 1", () => {
  const BANK = fs.readFileSync(path.join(HERE, "bank.js"), "utf8");
  assert.match(
    HOST,
    /turnLabel\.textContent = `Question \$\{res\.turn\} of \$\{res\.total\}`;[\s\S]{0,400}endGlance\(\)/,
    "the runner ends it as the first question paints",
  );
  // The bank stage never runs a question, so it must not carry an end path at all.
  assert.doesNotMatch(BANK, /endGlance/, "bank.js only ever turns the glance on");
});
