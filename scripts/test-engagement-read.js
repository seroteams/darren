#!/usr/bin/env node
// The engagement read is never trusted from thin data. The deterministic guard
// forces "inconclusive" when the read was partial OR the engagement+wellbeing
// axes barely registered — regardless of what the model returned. A wrong early
// disengagement label is worse than no label.

const assert = require("node:assert/strict");
const { applyEngagementReadGuard } = require("../backend/engine/reviewer.ts");

// A rich transcript: 6 substantive third-person notes → not a partial read.
const richTranscript = [
  { answer: "shipped the payments refactor clean, good energy this week" },
  { answer: "wants more scope clarity before projects are locked in" },
  { answer: "feels flat, nothing stretching her right now on the team" },
  { answer: "brought up mentoring the new junior, would drop a review slot" },
  { answer: "found out billing rewrite scope was cut without her" },
  { answer: "agreed to write up the scope gaps and bring them next week" },
];

// Axis state where engagement and wellbeing each moved more than once.
const richAxisState = {
  wellbeing: { score: -2, history: [{ delta: -1 }, { delta: -1 }] },
  engagement: { score: -5, history: [{ delta: -2 }, { delta: -3 }] },
  clarity: { score: -3, history: [{ delta: -3 }] },
  growth: { score: 1, history: [{ delta: 1 }] },
};

function read(level) {
  return {
    engagement_read: {
      level,
      evidence: ["found out billing rewrite scope was cut without her"],
      missing_evidence: "",
      recommended_action: "Map the billing role with her before scope locks.",
      watch_next: "Whether she keeps hearing major work through whispers.",
    },
  };
}

// 1. Rich session keeps a real concern — guard does NOT downgrade it.
{
  const b = applyEngagementReadGuard(read("clear_concern"), richAxisState, richTranscript);
  assert.equal(b.engagement_read.level, "clear_concern", "rich session keeps clear_concern");
}

// 2. Thin axis movement (engagement+wellbeing touches < 2) forces inconclusive
//    even when the rest of the session looks substantive.
{
  const thinAxis = {
    wellbeing: { score: 0, history: [] },
    engagement: { score: -1, history: [{ delta: -1 }] },
    clarity: { score: -3, history: [{ delta: -3 }] },
    growth: { score: 1, history: [{ delta: 1 }] },
  };
  const b = applyEngagementReadGuard(read("clear_concern"), thinAxis, richTranscript);
  assert.equal(b.engagement_read.level, "inconclusive", "thin axis movement forces inconclusive");
  assert.ok(b.engagement_read.missing_evidence, "missing_evidence backfilled when forced");
}

// 3. Partial read (mostly skipped transcript) forces inconclusive.
{
  const skippedTranscript = [
    { answer: "fine", skipped: false },
    { answer: "", skipped: true },
    { answer: "ok", skipped: false },
    { answer: "", skipped: true },
  ];
  const b = applyEngagementReadGuard(read("worth_checking"), richAxisState, skippedTranscript);
  assert.equal(b.engagement_read.level, "inconclusive", "partial read forces inconclusive");
}

// 4. Already inconclusive is left untouched (no spurious backfill of evidence).
{
  const input = read("inconclusive");
  input.engagement_read.evidence = [];
  const b = applyEngagementReadGuard(input, richAxisState, richTranscript);
  assert.equal(b.engagement_read.level, "inconclusive", "inconclusive stays inconclusive");
}

// 5. No engagement_read on the briefing → no-op, no throw.
{
  const b = applyEngagementReadGuard({ headline: "x" }, richAxisState, richTranscript);
  assert.equal(b.engagement_read, undefined, "absent engagement_read is a safe no-op");
}

console.log("PASS test-engagement-read");
