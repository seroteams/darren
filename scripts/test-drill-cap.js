#!/usr/bin/env node

const assert = require("node:assert/strict");
const {
  computeConsecutiveDrillCount,
  enforceDrillCap,
  isPlannerOriginated,
  isSameStagePlannerDrill,
} = require("../backend/engine/queue-manager");

function q(alias, stage, source = "planner_added") {
  return { alias, label: alias, name: alias, stage, source, axis_effects: { engagement: 1 } };
}

function turn(question) {
  return { question, answer: "some substantive answer here please" };
}

// --- isPlannerOriginated ---
assert.equal(isPlannerOriginated("planner_added"), true);
assert.equal(isPlannerOriginated("reworded_from:q_foo"), true);
assert.equal(isPlannerOriginated("research"), false);

// --- computeConsecutiveDrillCount ---
const frictionDrills = [
  turn(q("bank_1", "friction", "research")),
  turn(q("drill_1", "friction", "planner_added")),
  turn(q("drill_2", "friction", "reworded_from:drill_1")),
];
assert.equal(
  computeConsecutiveDrillCount(frictionDrills, q("drill_2", "friction", "reworded_from:drill_1")),
  2
);
assert.equal(
  computeConsecutiveDrillCount(
    [turn(q("drill_1", "friction", "planner_added")), turn(q("bank_1", "momentum", "research"))],
    q("bank_1", "momentum", "research")
  ),
  0
);

// --- enforceDrillCap strips same-stage planner drills when count >= 2 ---
const arc = {
  arc: [
    { id: "friction", label: "Friction", intent: "", target_questions: 2 },
    { id: "momentum", label: "Momentum", intent: "", target_questions: 2 },
  ],
};
const lastQuestion = q("drill_2", "friction", "planner_added");
const transcript = [
  turn(q("drill_1", "friction", "planner_added")),
  turn(lastQuestion),
];
const issues = [];
const momentumQ = q("next_momentum", "momentum", "research");
const stripped = enforceDrillCap({
  newQueue: [q("drill_3", "friction", "planner_added")],
  lastQuestion,
  remainingQueue: [momentumQ],
  consecutiveDrillCount: 2,
  transcript,
  arc,
  issues,
});
assert.equal(stripped[0].stage, "momentum", "should advance to next arc stage");
assert.ok(issues.some((i) => i.includes("drill cap: removed")));
assert.ok(issues.some((i) => i.includes("advanced queue toward stage momentum")));

// --- no strip when count < 2 ---
const issues2 = [];
const kept = enforceDrillCap({
  newQueue: [q("drill_2", "friction", "planner_added")],
  lastQuestion: q("drill_1", "friction", "planner_added"),
  remainingQueue: [],
  consecutiveDrillCount: 1,
  transcript: [turn(q("drill_1", "friction", "planner_added"))],
  arc,
  issues: issues2,
});
assert.equal(kept[0].alias, "drill_2");
assert.equal(issues2.length, 0);

assert.equal(isSameStagePlannerDrill(q("x", "friction", "planner_added"), "friction"), true);
assert.equal(isSameStagePlannerDrill(q("x", "friction", "research"), "friction"), false);

console.log("PASS test-drill-cap");
