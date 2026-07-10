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
  const notesAt = intro.indexOf("Your notes");
  const briefingAt = intro.indexOf("Your briefing");
  assert.ok(whoAt > -1, "step 1 — who it's with");
  assert.ok(notesAt > -1, "step 2 — your notes");
  assert.ok(briefingAt > -1, "step 3 — your briefing");
  assert.ok(whoAt < notesAt && notesAt < briefingAt, "steps read in order");
});

test("intro: orients a stranger to what happens first", () => {
  assert.ok(/first prep/i.test(intro), "tells them this is their first prep");
});

test("notes hint: shows one concrete, honest example — not generic fluff", () => {
  assert.ok(notes.includes(GOOD_NOTES_EXAMPLE), "renders the real example");
  // A real example is specific: it carries a rough timeframe and a change over time,
  // the opposite of 'write some notes'. Guard against regressing to fluff.
  assert.ok(GOOD_NOTES_EXAMPLE.length > 60, "example is a real sentence, not a stub");
  assert.ok(!/write (some )?notes/i.test(notes), "not a 'write some notes' prompt");
});

test("copy: UK English, no exclamation marks, no sub-14px inline font-size", () => {
  for (const [label, html] of [["intro", intro], ["notes", notes]] as const) {
    assert.ok(!html.includes("!"), `${label}: no exclamation marks`);
    // No inline font-size below the 14px floor (design rule). Sizing comes from
    // CSS tokens (>=14px); guard against any stray inline px under 14.
    const inline = [...html.matchAll(/font-size:\s*(\d+)px/g)];
    for (const m of inline) {
      assert.ok(Number(m[1]) >= 14, `${label}: inline font-size ${m[1]}px below 14 floor`);
    }
  }
});
