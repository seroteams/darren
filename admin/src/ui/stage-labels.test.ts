import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_DISPLAY, TOPBAR_STAGES, stageLabel } from "./stage-labels.js";

// The end-of-1:1 screen is the RESULT of the meeting, so it reads "Recap".
// "Briefing" is a before-word and belongs to the pre-meeting "Prep brief" step —
// having both said "brief" is the clash this rename fixed (Carl, 2026-07-17).
test("the end-of-1:1 stage reads Recap, never Briefing", () => {
  assert.equal(STAGE_DISPLAY.BRIEFING, "Recap");
  assert.equal(stageLabel("BRIEFING"), "Recap");
});

test("the topbar's last step is Recap, long and short form", () => {
  const last = TOPBAR_STAGES[TOPBAR_STAGES.length - 1];
  assert.deepEqual(last, ["BRIEFING", "Recap", "Recap"]);
});

test("no stage label reuses the before-word 'brief' for an after-stage", () => {
  // The pre-meeting stage keeps "Prep brief" — that one is correct.
  assert.equal(STAGE_DISPLAY.PREPARATION, "Prep brief");
  assert.ok(!/brief/i.test(STAGE_DISPLAY.BRIEFING), "the after-stage carries no brief-word");
});

// The internal key stays BRIEFING — it's the engine/pipeline contract. Renaming
// the key (rather than the label) would break the run's stage plumbing.
test("the internal stage key is untouched by the display rename", () => {
  assert.ok("BRIEFING" in STAGE_DISPLAY, "BRIEFING key still addresses the stage");
  assert.equal(TOPBAR_STAGES[TOPBAR_STAGES.length - 1][0], "BRIEFING");
});
