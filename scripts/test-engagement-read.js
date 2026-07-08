#!/usr/bin/env node
// The engagement read is never trusted from thin data. Since the no-inference
// re-spec (docs/plans/done/no-inference-ruling/phase-3.md) the read carries NO state
// label — only `read_status` ("read" | "not_read", the evidence status of this
// session's record) plus observable content: the manager's own observed shift,
// transcript quotes, and what to watch next. The deterministic guard forces
// "not_read" when the read was partial OR the engagement+wellbeing axes barely
// registered — regardless of what the model returned. It also normalises the
// legacy `level` shape found in stored runs.

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

function read(read_status) {
  return {
    engagement_read: {
      read_status,
      observed_shift: "You noted she has been quieter in reviews than usual.",
      evidence: ["found out billing rewrite scope was cut without her"],
      missing_evidence: "",
      recommended_action: "Map the billing role with her before scope locks.",
      watch_next: "Whether she keeps hearing major work through whispers.",
    },
  };
}

// 1. Rich session keeps a substantive read — guard does NOT downgrade it.
{
  const b = applyEngagementReadGuard(read("read"), richAxisState, richTranscript);
  assert.equal(b.engagement_read.read_status, "read", "rich session keeps read");
  assert.ok(b.engagement_read.observed_shift, "observed_shift survives on a rich session");
}

// 2. Thin axis movement (engagement+wellbeing touches < 2) forces not_read
//    even when the rest of the session looks substantive.
{
  const thinAxis = {
    wellbeing: { score: 0, history: [] },
    engagement: { score: -1, history: [{ delta: -1 }] },
    clarity: { score: -3, history: [{ delta: -3 }] },
    growth: { score: 1, history: [{ delta: 1 }] },
  };
  const b = applyEngagementReadGuard(read("read"), thinAxis, richTranscript);
  assert.equal(b.engagement_read.read_status, "not_read", "thin axis movement forces not_read");
  assert.ok(b.engagement_read.missing_evidence, "missing_evidence backfilled when forced");
  assert.equal(b.engagement_read.observed_shift, "", "forced not_read blanks observed_shift");
}

// 3. Partial read (mostly skipped transcript) forces not_read.
{
  const skippedTranscript = [
    { answer: "fine", skipped: false },
    { answer: "", skipped: true },
    { answer: "ok", skipped: false },
    { answer: "", skipped: true },
  ];
  const b = applyEngagementReadGuard(read("read"), richAxisState, skippedTranscript);
  assert.equal(b.engagement_read.read_status, "not_read", "partial read forces not_read");
}

// 4. Already not_read is left untouched (no spurious backfill of evidence).
{
  const input = read("not_read");
  input.engagement_read.evidence = [];
  const b = applyEngagementReadGuard(input, richAxisState, richTranscript);
  assert.equal(b.engagement_read.read_status, "not_read", "not_read stays not_read");
}

// 5. No engagement_read on the briefing → no-op, no throw.
{
  const b = applyEngagementReadGuard({ headline: "x" }, richAxisState, richTranscript);
  assert.equal(b.engagement_read, undefined, "absent engagement_read is a safe no-op");
}

// 6. Legacy shape (stored runs / frozen replays carry `level`) is normalised:
//    the state-label enum is dropped, never surfaced.
{
  const legacy = {
    engagement_read: {
      level: "worth_checking",
      evidence: ["found out billing rewrite scope was cut without her"],
      missing_evidence: "",
      recommended_action: "Map the billing role with her before scope locks.",
      watch_next: "Whether she keeps hearing major work through whispers.",
    },
  };
  const b = applyEngagementReadGuard(legacy, richAxisState, richTranscript);
  assert.equal(b.engagement_read.level, undefined, "legacy level is dropped");
  assert.equal(b.engagement_read.read_status, "read", "substantive legacy level maps to read");
  assert.equal(typeof b.engagement_read.observed_shift, "string", "observed_shift backfilled as a string");
}

// 7. Legacy "inconclusive" maps to not_read.
{
  const legacy = { engagement_read: { level: "inconclusive", evidence: [], missing_evidence: "thin", recommended_action: "", watch_next: "" } };
  const b = applyEngagementReadGuard(legacy, richAxisState, richTranscript);
  assert.equal(b.engagement_read.read_status, "not_read", "legacy inconclusive maps to not_read");
  assert.equal(b.engagement_read.level, undefined, "legacy level is dropped");
}

console.log("PASS test-engagement-read");
