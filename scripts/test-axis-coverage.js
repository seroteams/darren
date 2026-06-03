#!/usr/bin/env node
// Regression: coverage-injection must not stamp an axis onto a runtime
// thread-follow. Reproduces the Maya Chen run (logs/june/2026_Jun02_21-31-d5ba01d7)
// where q_thread_follow_7 was logged with wellbeing:3 despite declaring only
// clarity/growth — the thread-follow content (retry logic) carries no wellbeing.

const assert = require("node:assert/strict");
const { enforceAxisCoverage } = require("../src/queue-manager");

// All axes touched except wellbeing → coverage wants to inject wellbeing.
const axisState = {
  wellbeing: { history: [] },
  engagement: { history: [{ delta: 1 }] },
  clarity: { history: [{ delta: 1 }] },
  growth: { history: [{ delta: 1 }] },
};

const threadFollow = {
  alias: "q_thread_follow_7",
  label: "Thread follow",
  name: "When you assumed retry logic already covered it, what did you expect?",
  source: "planner_added",
  axis_effects: { clarity: 1, growth: 1 },
};

const issues = [];
const out = enforceAxisCoverage({
  newQueue: [threadFollow],
  axisState,
  turnNumber: 4,
  issues,
});
assert.deepEqual(
  out[0].axis_effects,
  { clarity: 1, growth: 1 },
  "thread-follow axis_effects untouched by coverage injection"
);
assert.equal(issues.length, 0, "no coverage-injection issue logged for thread-follow");

// Control: a genuine planned question at front still gets the coverage nudge.
const planned = {
  alias: "q_quality_bar",
  label: "Quality bar",
  name: "What does 'ready for review' mean in your own process?",
  source: "generated",
  axis_effects: { clarity: 3, growth: 1 },
};
const issues2 = [];
const out2 = enforceAxisCoverage({
  newQueue: [planned],
  axisState,
  turnNumber: 4,
  issues: issues2,
});
assert.equal(out2[0].axis_effects.wellbeing, 3, "planned question receives coverage axis");
assert.ok(
  issues2.some((i) => i.includes("injected wellbeing")),
  "coverage injection logged for planned question"
);

console.log("PASS test-axis-coverage");
