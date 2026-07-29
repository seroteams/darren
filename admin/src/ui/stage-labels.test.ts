import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_DISPLAY, TOPBAR_STAGES, stageLabel } from "./stage-labels.js";

// The end-of-1:1 screen is the RESULT of the meeting, so it reads "Recap".
// "Briefing" is a before-word and belongs to the pre-meeting prep step —
// having both say "brief" is the clash that rename fixed (Carl, 2026-07-17).
test("the end-of-1:1 stage reads Recap, never Briefing", () => {
  assert.equal(STAGE_DISPLAY.BRIEFING, "Recap");
  assert.equal(stageLabel("BRIEFING"), "Recap");
});

test("the topbar's last step is Recap", () => {
  const last = TOPBAR_STAGES[TOPBAR_STAGES.length - 1];
  assert.deepEqual(last, ["BRIEFING", "Recap"]);
});

test("no stage label reuses the before-word 'brief' for an after-stage", () => {
  assert.ok(!/brief/i.test(STAGE_DISPLAY.BRIEFING), "the after-stage carries no brief-word");
});

// The internal key stays BRIEFING — it's the engine/pipeline contract. Renaming
// the key (rather than the label) would break the run's stage plumbing.
test("the internal stage key is untouched by the display rename", () => {
  assert.ok("BRIEFING" in STAGE_DISPLAY, "BRIEFING key still addresses the stage");
  assert.equal(TOPBAR_STAGES[TOPBAR_STAGES.length - 1][0], "BRIEFING");
});

// ── audit small sweep: ONE name per step, at every width (Carl, 2026-07-29) ──────
// There used to be a long form and a short form. The topbar painted the long labels,
// measured the overflow and fell back to the short ones — so a guest, who has no nav
// rail and therefore more room, read "During the meeting" where a manager read
// "Meeting". Same step, two names, decided by who you were and how wide your window was.

test("every topbar step carries exactly one label, so there is no second form to drift", () => {
  for (const entry of TOPBAR_STAGES) {
    assert.equal(entry.length, 2, `${entry[0]} should be [key, label], not [key, long, short]`);
    assert.equal(typeof entry[1], "string");
    assert.ok(entry[1].length > 0, `${entry[0]} has a label`);
  }
});

test("the topbar labels ARE the shared display names, not a parallel list", () => {
  for (const [key, label] of TOPBAR_STAGES) {
    assert.equal(label, STAGE_DISPLAY[key as keyof typeof STAGE_DISPLAY], `${key} matches STAGE_DISPLAY`);
  }
});

test("the old long forms are gone from the vocabulary", () => {
  const labels = Object.values(STAGE_DISPLAY);
  for (const gone of ["Focus areas", "Prep brief", "During the meeting", "Pulling it together"]) {
    assert.ok(!labels.includes(gone), `"${gone}" should no longer be a stage name`);
  }
});

test("the seven run steps read as the agreed set", () => {
  assert.deepEqual(
    TOPBAR_STAGES.map(([, label]) => label),
    ["Setup", "Focus", "Prep", "Questions", "Meeting", "Wrap-up", "Recap"],
  );
});
