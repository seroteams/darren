#!/usr/bin/env node
// Coverage enforcement must be HONEST: an untouched axis gets a real question
// that probes it — promoted from the queue or pulled from the bank — never an
// axis label stamped onto a question whose text doesn't carry it. Originally
// reproduced the Maya Chen run (logs/june/2026_Jun02_21-31-d5ba01d7) where
// q_thread_follow_7 was logged with wellbeing:3 despite declaring only
// clarity/growth.

const assert = require("node:assert/strict");
const { enforceAxisCoverage } = require("../backend/engine/queue-manager.ts");

// All axes touched except wellbeing → coverage wants wellbeing served.
const axisState = {
  wellbeing: { history: [] },
  engagement: { history: [{ delta: 1 }] },
  clarity: { history: [{ delta: 1 }] },
  growth: { history: [{ delta: 1 }] },
};

const arc = {
  arc: [
    { id: "pulse", label: "Pulse", intent: "check in", target_questions: 1 },
    { id: "friction", label: "Friction", intent: "find friction", target_questions: 2 },
  ],
};

const threadFollow = {
  alias: "q_thread_follow_7",
  label: "Thread follow",
  name: "When you assumed retry logic already covered it, what did you expect?",
  source: "planner_added",
  axis_effects: { clarity: 1, growth: 1 },
};

const planned = {
  alias: "q_quality_bar",
  label: "Quality bar",
  name: "What does 'ready for review' mean in your own process?",
  source: "generated",
  axis_effects: { clarity: 3, growth: 1 },
};

const bankWellbeing = {
  alias: "q_energy_check",
  label: "Energy check",
  name: "Where is your energy at right now, and what's driving it?",
  source: "generated",
  stage: "pulse",
  axis_effects: { wellbeing: 3 },
};

// 1. Promote: a later queue item already carries the axis → moved to front,
//    nothing stamped, bank not consulted.
{
  const issues = [];
  const laterCarrier = { ...bankWellbeing, alias: "q_energy_queued" };
  const out = enforceAxisCoverage({
    newQueue: [planned, laterCarrier],
    axisState,
    turnNumber: 4,
    issues,
    arc,
    bankLoader: () => {
      throw new Error("bank must not be consulted when the queue already carries the axis");
    },
  });
  assert.equal(out[0].alias, "q_energy_queued", "axis-carrying item promoted to front");
  assert.equal(out[1].alias, "q_quality_bar", "displaced item keeps its place behind");
  assert.ok(issues.some((i) => i.includes("promoted")), "promotion logged");
}

// 2. Bank insert behind a thread-follow: the follow stays first, a REAL
//    wellbeing question from the bank lands at index 1, axis_effects untouched.
{
  const issues = [];
  const out = enforceAxisCoverage({
    newQueue: [threadFollow, planned],
    axisState,
    turnNumber: 4,
    issues,
    arc,
    bankLoader: () => [bankWellbeing],
  });
  assert.equal(out[0].alias, "q_thread_follow_7", "thread-follow keeps the front slot");
  assert.equal(out[1].alias, "q_energy_check", "bank question inserted right after the follow");
  assert.deepEqual(
    out[0].axis_effects,
    { clarity: 1, growth: 1 },
    "thread-follow axis_effects untouched"
  );
  assert.ok(issues.some((i) => i.includes("inserted q_energy_check")), "bank insert logged");
}

// 3. Arc guard: a bank candidate whose stage is foreign to this meeting's arc
//    is conversation-wrong — never inserted just because it is axis-correct.
{
  const issues = [];
  const foreignStage = { ...bankWellbeing, alias: "q_foreign", stage: "gap" };
  const out = enforceAxisCoverage({
    newQueue: [planned],
    axisState,
    turnNumber: 4,
    issues,
    arc,
    bankLoader: () => [foreignStage],
  });
  assert.deepEqual(
    out.map((q) => q.alias),
    ["q_quality_bar"],
    "foreign-stage candidate not inserted"
  );
  assert.ok(
    issues.some((i) => i.includes("queue unchanged")),
    "honest fallback logged when nothing real fits"
  );
}

// 4. No fake stamp anywhere: in every branch, no question gains an axis its
//    own definition didn't declare. The original objects are never mutated.
{
  const issues = [];
  const out = enforceAxisCoverage({
    newQueue: [planned],
    axisState,
    turnNumber: 4,
    issues,
    arc,
    bankLoader: () => [],
  });
  assert.equal(out[0].axis_effects.wellbeing, undefined, "no wellbeing stamped onto the question");
  assert.equal(planned.axis_effects.wellbeing, undefined, "original object not mutated");
  assert.equal(
    issues.some((i) => i.includes("injected")),
    false,
    "no injection issue — stamping is gone"
  );
}

// 5. Quiet paths unchanged: before turn 4, or when all axes are touched,
//    the queue passes through untouched.
{
  const issues = [];
  const early = enforceAxisCoverage({
    newQueue: [planned],
    axisState,
    turnNumber: 3,
    issues,
    arc,
    bankLoader: () => [bankWellbeing],
  });
  assert.deepEqual(early.map((q) => q.alias), ["q_quality_bar"], "no coverage before turn 4");
  assert.equal(issues.length, 0, "no issues before turn 4");

  const touched = {
    ...axisState,
    wellbeing: { history: [{ delta: 1 }] },
  };
  const all = enforceAxisCoverage({
    newQueue: [planned],
    axisState: touched,
    turnNumber: 5,
    issues,
    arc,
    bankLoader: () => [bankWellbeing],
  });
  assert.deepEqual(all.map((q) => q.alias), ["q_quality_bar"], "no coverage when all axes touched");
}

console.log("PASS test-axis-coverage");
