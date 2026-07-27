// The "What is Sero?" page (visual rebuild 2026-07-27, mock approved by Carl:
// ghost-lines sample). One shared stage, two voices; these tests pin the copy
// contract and the ordering the mock fixed, mirroring start-welcome.test.ts.
//
// The rule that matters most here: the sample card shows the SHAPE of a brief
// (ghost lines), never invented text dressed up as engine output. If someone
// swaps the ghosts for written copy, the invented-text assertion fails.
import test from "node:test";
import assert from "node:assert/strict";
import { managerHtml, memberHtml, STEPS, ALPHA_LINE } from "./about.js";

const manager = managerHtml();
const member = memberHtml();

test("the manager page opens on the promise, with the one way in", () => {
  assert.ok(manager.includes("Walk into every 1:1 with a plan"), "the headline is the promise");
  assert.ok(manager.includes("writes a short brief to guide the conversation"), "the lede says what Sero does");
  assert.ok(manager.includes("js-start"), "the Start 1:1 CTA is there");
  assert.equal(manager.match(/class="btn\b/g)?.length, 1, "exactly one blue action on the screen");
});

test("the manager copy assumes nothing about being logged in", () => {
  // The manager view doubles as the logged-out guest view (/about is in the
  // shared set), so it must never point at chrome a stranger cannot see.
  assert.ok(!/home page/i.test(manager), "no 'your Home page' phrasing");
});

test("how it works: four steps, in order, after the CTA", () => {
  assert.equal(STEPS.length, 4, "four steps, matching the mock");
  let last = manager.indexOf("js-start");
  for (const [i, s] of STEPS.entries()) {
    assert.ok(manager.includes(s.title), `step ${i + 1}: title rendered`);
    assert.ok(manager.includes(s.body), `step ${i + 1}: body rendered`);
    const at = manager.indexOf(s.title);
    assert.ok(at > last, `step ${i + 1} renders after what precedes it (CTA high, steps in order)`);
    last = at;
  }
});

test("the sample card is labelled, decorative, and shows shape rather than invented text", () => {
  assert.ok(manager.includes("Sample brief"), "the card says it is a sample, on its face");
  assert.ok(manager.indexOf(STEPS[3].title) < manager.indexOf("Sample brief"), "steps explain before the sample proves");
  assert.ok(manager.includes('class="about-sample" aria-hidden="true"'), "the card is decorative to screen readers");
  assert.ok(manager.includes("about-ghost"), "ghost lines carry the brief's shape");
  for (const label of ["How to open", "What to explore", "What to listen for"]) {
    assert.ok(manager.includes(label), `section label "${label}" is real text`);
  }
  // Ghost lines were Carl's pick (option A) precisely so no written copy poses
  // as engine output. The opening question would be the giveaway if that drifts.
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
