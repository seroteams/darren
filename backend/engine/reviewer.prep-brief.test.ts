import test from "node:test";
import assert from "node:assert/strict";
import { assembleEvaluation, formatPrepBrief } from "./reviewer.ts";
import type { PreparationResult } from "../shared/session.types.ts";

// No dead wires Phase 1: the prep brief reaches the final briefing. The
// formatter carries facts only (plan-vs-reality raw material); the prompt
// instruction text lives in final-evaluation.md (<prep_follow_through_rule>),
// mirroring the formatPromiseCheckin split in promise-history.ts.

const PREP: PreparationResult["brief"] = {
  coreIssue: "Daryl is carrying the beta cutover alone",
  openingQuestion: "How is the cutover sitting with you this week?",
  listenFor: [
    "whether he names the cutover unprompted",
    "if his energy drops when delivery comes up",
    "whether support from the team is landing",
  ],
  avoid: ["do not lead with the deadline", "do not promise extra headcount"],
  goodOutcome: "Daryl leaves owning one concrete next step on the cutover",
  suggestedAction: "During the 1:1, agree one task to take off his plate",
  confidence: "Medium",
  dontAssume: "That the silence in standups means disengagement",
  styleTip: "Keep it conversational.",
};

const CTX = {
  name: "Daryl",
  role: "Engineering Manager",
  seniority: "Mid",
  meetingType: "Bi-weekly check-in",
  notes: "Been quieter than usual in standups.",
};

test("formatPrepBrief: renders the plan facts, one line each", () => {
  const block = formatPrepBrief(PREP);
  assert.ok(block.includes("Core issue to explore: Daryl is carrying the beta cutover alone"));
  assert.ok(block.includes("What a good outcome looked like: Daryl leaves owning one concrete next step"));
  assert.ok(block.includes("Listening for: whether he names the cutover unprompted;"));
  assert.ok(block.includes("Suggested action to leave with: During the 1:1, agree one task"));
  assert.ok(block.includes("Warned not to assume: That the silence in standups means disengagement"));
});

test("formatPrepBrief: excludes prep-time coaching meta (avoid / styleTip / confidence / opener)", () => {
  const block = formatPrepBrief(PREP);
  assert.ok(!block.includes("do not lead with the deadline"), "avoid[] is coaching meta, not plan facts");
  assert.ok(!block.includes("Keep it conversational"), "styleTip is coaching meta");
  assert.ok(!block.includes("How is the cutover sitting"), "the opener is visible in the transcript if asked");
});

test("formatPrepBrief: sentinel when there was no brief", () => {
  const sentinel = "(no prep brief was recorded for this 1:1)";
  assert.equal(formatPrepBrief(null), sentinel);
  assert.equal(formatPrepBrief(undefined), sentinel);
});

test("assembleEvaluation: the prep brief lands in the prompt", () => {
  const { prompt } = assembleEvaluation({ ctx: CTX, transcript: [], prep: PREP });
  assert.ok(prompt.includes("Core issue to explore: Daryl is carrying the beta cutover alone"));
  assert.ok(!prompt.includes("{{PREP"), "no unfilled PREP placeholder may ship to the model");
});

test("assembleEvaluation: no prep means the sentinel, never a ghost plan", () => {
  const { prompt } = assembleEvaluation({ ctx: CTX, transcript: [] });
  assert.ok(prompt.includes("(no prep brief was recorded for this 1:1)"));
  assert.ok(!prompt.includes("{{PREP"), "no unfilled PREP placeholder may ship to the model");
});
