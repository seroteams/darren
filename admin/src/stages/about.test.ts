// The "What is Sero?" page. Manager view rebuilt 2026-07-29 as the six-step
// "How Sero works" one-pager (gallery prototype "How it works. Three shapes",
// Carl picked shape C with a picture per step). One shared stage, two voices;
// these tests pin the copy contract and the ordering, mirroring
// start-welcome.test.ts.
//
// The rule that matters most here: every picture is a ghost schematic (shapes
// drawn in tokens), never invented text dressed up as engine output.
import test from "node:test";
import assert from "node:assert/strict";
import { managerHtml, memberHtml, ALPHA_LINE } from "./about.js";
import { HOW_STEPS, CHAPTERS } from "./about-steps.ts";
import { STAGE_DISPLAY } from "../ui/stage-labels.js";

const manager = managerHtml();
const member = memberHtml();

test("the manager page opens on the walkthrough promise, with the one way in", () => {
  assert.ok(manager.includes("How Sero works"), "the headline names the job");
  assert.ok(manager.includes("From rough notes to a better 1:1, in six steps."), "the lede sets the count");
  assert.ok(manager.includes("js-start"), "the Start 1:1 CTA is there");
  assert.equal(manager.match(/class="btn\b/g)?.length, 1, "exactly one blue action on the screen");
});

test("the manager copy assumes nothing about being logged in", () => {
  // The manager view doubles as the logged-out guest view (/about is in the
  // shared set), so it must never point at chrome a stranger cannot see.
  assert.ok(!/home page/i.test(manager), "no 'your Home page' phrasing");
});

test("the six steps render in order, after the CTA, chaptered before / in the room / after", () => {
  assert.equal(HOW_STEPS.length, 6, "six steps, matching the chosen prototype");
  assert.deepEqual(CHAPTERS, ["Before", "In the room", "After"], "the three chapters, in meeting order");
  let last = manager.indexOf("js-start");
  for (const [i, s] of HOW_STEPS.entries()) {
    assert.ok(manager.includes(s.title), `step ${i + 1}: title rendered`);
    assert.ok(manager.includes(s.line), `step ${i + 1}: line rendered`);
    assert.ok(manager.includes(s.you), `step ${i + 1}: the "You:" line rendered`);
    const at = manager.indexOf(s.title);
    assert.ok(at > last, `step ${i + 1} renders after what precedes it (CTA high, steps in order)`);
    last = at;
  }
  for (const cap of CHAPTERS) {
    assert.ok(manager.includes(`>${cap}<`), `chapter label "${cap}" rendered`);
  }
});

test("step names bridge to the real screens, never a fourth vocabulary", () => {
  // Each step carries the exact label a manager sees on the real stepper,
  // straight from STAGE_DISPLAY, so the walkthrough cannot drift from the app.
  for (const key of ["INTAKE", "FOCUS_POINTS", "PREPARATION", "QUESTIONING", "BRIEFING"] as const) {
    assert.ok(
      manager.includes(`On screen: ${STAGE_DISPLAY[key]}`),
      `the "${STAGE_DISPLAY[key]}" screen label is on the page`,
    );
  }
});

test("step 4 carries the weight, and every step has a ghost picture", () => {
  assert.ok(manager.includes("about-how__row--big"), "the in-the-room step is visually weighted");
  const bigAt = manager.indexOf("about-how__row--big");
  assert.ok(
    manager.indexOf("Sero sits in the meeting with you") > bigAt,
    "the weighted row is the in-the-room step",
  );
  assert.equal(manager.match(/class="about-art"/g)?.length, 6, "one picture per step");
  assert.ok((manager.match(/<svg/g) ?? []).length >= 6, "the pictures are inline SVG");
});

test("the pictures are shapes, never invented text posing as engine output", () => {
  // Ghost schematics only: no <text> inside any step SVG, and the old sample
  // brief's giveaway line must never reappear as copy.
  assert.ok(!/<svg[^>]*>[\s\S]*?<text/.test(manager), "no written words inside the step pictures");
  assert.ok(!/How has the last couple of weeks/.test(manager), "no sample prose posing as a real brief");
});

test("the alpha note is honest and offers the feedback door, quietly", () => {
  for (const [label, markup] of [["manager", manager], ["member", member]] as const) {
    assert.ok(markup.includes(ALPHA_LINE), `${label}: the alpha line is there`);
    assert.ok(markup.includes("js-feedback"), `${label}: Send feedback is wired`);
  }
});

test("the member page keeps the privacy promises and carries no CTA", () => {
  assert.ok(!member.includes("js-start"), "no Start CTA in the member voice");
  assert.ok(!/class="btn\b/.test(member), "no blue action at all");
  assert.ok(member.includes("What you can see"), "the visibility card is there");
  assert.ok(member.includes("Nothing more, nothing hidden"), "the visibility promise survives");
  assert.ok(member.includes("never shared back to you here"), "the privacy promise survives");
  assert.ok(member.includes("doesn't ask you for anything or score you"), "the no-scoring promise survives");
});

test("copy: no em dashes, no exclamation marks, no sub-14px inline font-size", () => {
  for (const [label, markup] of [["manager", manager], ["member", member]] as const) {
    // Escapes, not the characters themselves: the copy linter scans this repo too.
    assert.ok(!markup.includes("\u2014"), `${label}: no em dash (house rule)`);
    assert.ok(!markup.includes(" \u2013 "), `${label}: no en dash separator either`);
    assert.ok(!markup.includes("!"), `${label}: no exclamation marks`);
    for (const m of markup.matchAll(/font-size:\s*(\d+)px/g)) {
      assert.ok(Number(m[1]) >= 14, `${label}: inline font-size ${m[1]}px below the 14 floor`);
    }
  }
});
