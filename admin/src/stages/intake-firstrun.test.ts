import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

// This card is wizard-only. Home's first visit is the brief-first welcome
// (start-welcome.ts, onboarding-firstrun Phase 2), which owns the button-hosting slot
// and the time line; the option that used to put them here went with it.
test("intro: the card is guidance only, with no button and no host for one", () => {
  assert.ok(!intro.includes("js-start-slot"), "no action slot: Home no longer hosts this card");
  assert.ok(!/<button/.test(intro), "the card brings no button of its own");
  assert.ok(!intro.includes("intake-firstrun__action"), "no action row");
});

test("intro: no time claim mid-flow", () => {
  assert.ok(!intro.includes("two minutes"), "the intake screen does not repeat the typing claim mid-flow");
});

// onboarding-firstrun Phase 1. The wizard decides "first-timer" with the shared rule
// from start-rows.ts. Its own raw zero-count included the seeded example, so from the
// day seeding began no normal signup ever saw this guidance. intake.js mounts through
// the DOM, so this guard reads the source (same approach as start-core.test.ts).
const intakeSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "intake.js"), "utf8");

test("the wizard's first-run gate uses the shared real-runs rule, not a raw count", () => {
  assert.ok(/import \{ hasRealRuns \} from "\.\/start-rows\.ts"/.test(intakeSrc), "one rule, imported from start-rows.ts");
  assert.ok(/!hasRealRuns\(recentRes\.value\.runs\)/.test(intakeSrc), "first-run = no REAL runs");
  assert.ok(!/runs\.length === 0/.test(intakeSrc), "the raw zero-count gate is gone");
  assert.ok(intakeSrc.includes("listRecentRuns(2)"), "fetches 2 so the seeded example cannot mask a real run");
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
