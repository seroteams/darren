#!/usr/bin/env node
// Regression: recurring-gap clarity damper caps 2nd+ competency clarity hits at -1.
// Maya run (Jun03) stacked -3 clarity on the same craft gap → clarity -10.

const assert = require("node:assert/strict");
const { applyRecurringGapClarityDamper } = require("../src/queue-manager");

const competencyQ = {
  alias: "q_ready_sooner",
  purpose: "competency",
  axis_effects: { clarity: 3, growth: 1 },
};

function runDamper(rawDeltas, transcript, lastQuestion = competencyQ) {
  const issues = [];
  const deltas = { ...rawDeltas };
  applyRecurringGapClarityDamper(deltas, {
    lastQuestion,
    transcript,
    issues,
  });
  return { deltas, issues };
}

// First competency clarity negative — no prior hit → unchanged
{
  const { deltas, issues } = runDamper({ clarity: -3 }, []);
  assert.equal(deltas.clarity, -3, "first competency clarity hit not capped");
  assert.equal(issues.length, 0);
}

// Second competency clarity -3 after prior competency booked clarity -3 → -1
{
  const transcript = [
    {
      question: { purpose: "competency", alias: "q_empty_states_miss" },
      realized_deltas: { clarity: -3 },
    },
    { question: { purpose: "competency", alias: "q_ready_sooner" }, answer: "x" },
  ];
  const { deltas, issues } = runDamper({ clarity: -3 }, transcript);
  assert.equal(deltas.clarity, -1, "second competency clarity hit capped to -1");
  assert.ok(
    issues.some((i) => i.includes("recurring-gap damper")),
    "damper issue logged"
  );
}

// Topic question with prior competency hit — damper does not apply
{
  const transcript = [
    {
      question: { purpose: "competency" },
      realized_deltas: { clarity: -3 },
    },
  ];
  const { deltas, issues } = runDamper(
    { clarity: -3 },
    transcript,
    { purpose: "topic", alias: "q_open" }
  );
  assert.equal(deltas.clarity, -3, "non-competency question not damped");
  assert.equal(issues.length, 0);
}

// Already -1 or milder — no cap
{
  const transcript = [
    { question: { purpose: "competency" }, realized_deltas: { clarity: -3 } },
  ];
  const { deltas, issues } = runDamper({ clarity: -1 }, transcript);
  assert.equal(deltas.clarity, -1, "clarity -1 left unchanged");
  assert.equal(issues.length, 0);
}

// Prior negative on topic only — no damper
{
  const transcript = [
    { question: { purpose: "topic" }, realized_deltas: { clarity: -3 } },
  ];
  const { deltas, issues } = runDamper({ clarity: -3 }, transcript);
  assert.equal(deltas.clarity, -3, "topic-only prior does not trigger damper");
  assert.equal(issues.length, 0);
}

console.log("PASS test-recurring-gap-damper");
