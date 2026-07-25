import { test } from "node:test";
import assert from "node:assert/strict";
import { firstRunIntroHtml, firstRunNotesExampleHtml, GOOD_NOTES_EXAMPLE } from "./intake-firstrun.ts";

// Phase 4 (validation-kit) — first-run guidance for a brand-new manager. The copy
// is fixed by the house rules: UK English, plain words, no exclamation marks, and
// no font-size below the 14px floor (no inline styles under 14px anywhere).

const intro = firstRunIntroHtml();
const notes = firstRunNotesExampleHtml();

test("intro: names the three plain steps in order", () => {
  const whoAt = intro.indexOf("Who it's with");
  const mindAt = intro.indexOf("What's on your mind");
  const briefAt = intro.indexOf("Your prep brief");
  assert.ok(whoAt > -1, "step 1. Who it's with");
  assert.ok(mindAt > -1, "step 2. What's on your mind");
  assert.ok(briefAt > -1, "step 3. Your prep brief");
  assert.ok(whoAt < mindAt && mindAt < briefAt, "steps read in order");
});

test("intro: orients a stranger to what happens first", () => {
  assert.ok(/first prep/i.test(intro), "tells them this is their first prep");
});

test("intro: step 3 uses the pre-meeting term (prep brief), not the post-meeting one (briefing)", () => {
  // Keep the two artefacts distinct — the blind test compares them.
  assert.ok(intro.includes("Your prep brief"), "step 3 is the prep brief");
  assert.ok(!/\bbriefing\b/i.test(intro), "no 'briefing' in the first-run card");
});

test("notes hint: shows one concrete, honest example. Not generic fluff", () => {
  assert.ok(notes.includes(GOOD_NOTES_EXAMPLE), "renders the real example");
  // A real example is specific: it carries a rough timeframe and a change over time,
  // the opposite of 'write some notes'. Guard against regressing to fluff.
  assert.ok(GOOD_NOTES_EXAMPLE.length > 60, "example is a real sentence, not a stub");
  assert.ok(!/write (some )?notes/i.test(notes), "not a 'write some notes' prompt");
});

// home-screen-truth Phase 2 — on Home the card IS the invitation, so it hosts the
// screen's one blue action. The intake screen must be provably unchanged: it calls
// firstRunIntroHtml() with no options and still gets no slot and no action line.
const introWithSlot = firstRunIntroHtml({ actionSlot: true });

test("intro: the default call is unchanged, so the intake screen keeps exactly what it had", () => {
  assert.ok(!intro.includes("js-start-slot"), "no action slot by default");
  assert.ok(!/<button/.test(intro), "the card brings no button of its own");
  assert.ok(!intro.includes("intake-firstrun__action"), "no action row by default");
});

test("intro: actionSlot opens a host for the screen's existing button, and adds no second one", () => {
  assert.ok(introWithSlot.includes("js-start-slot"), "the slot is there for Home to fill");
  assert.ok(!/<button/.test(introWithSlot), "the slot is empty: Home moves its one button in");
});

test("intro: the time line is honest about the typing, not the whole flow", () => {
  assert.ok(/two minutes/i.test(introWithSlot), "sets an expectation");
  assert.ok(/typing/i.test(introWithSlot), "the claim is about what they type, which is what we can stand behind");
  assert.ok(!intro.includes("two minutes"), "the intake screen does not repeat it mid-flow");
});

test("copy: UK English, no exclamation marks, no sub-14px inline font-size", () => {
  for (const [label, html] of [["intro", intro], ["notes", notes], ["intro+slot", introWithSlot]] as const) {
    assert.ok(!html.includes("!"), `${label}: no exclamation marks`);
    // No inline font-size below the 14px floor (design rule). Sizing comes from
    // CSS tokens (>=14px); guard against any stray inline px under 14.
    const inline = [...html.matchAll(/font-size:\s*(\d+)px/g)];
    for (const m of inline) {
      assert.ok(Number(m[1]) >= 14, `${label}: inline font-size ${m[1]}px below 14 floor`);
    }
  }
});
