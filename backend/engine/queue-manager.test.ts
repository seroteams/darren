import test from "node:test";
import assert from "node:assert/strict";
import { enforceCloserOnFinalTurn, enforceBudgetLength, clampToSignature } from "./queue-manager.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import type { Question } from "../shared/question.types.ts";

// Queue-shape gates (Phase 2). The two new gates are pure — they only read
// `.alias` off each item — so they're tested here with minimal stand-ins. The
// last two tests are regressions locking gates that already existed before this
// phase (off-signature clamp, relational-arc competency), so they can't quietly
// break.

const q = (alias: string): Question => ({ alias } as unknown as Question);

// --- Budget-length gate ----------------------------------------------------

test("enforceBudgetLength: over remaining_budget+1 is truncated from the tail", () => {
  const issues: string[] = [];
  const out = enforceBudgetLength({
    newQueue: [q("a"), q("b"), q("c"), q("d"), q("e"), q("f"), q("g")],
    remainingBudget: 5,
    issues,
  });
  assert.equal(out.length, 6); // 5 + 1
  assert.deepEqual(out.map((x) => x.alias), ["a", "b", "c", "d", "e", "f"]);
  assert.equal(issues.length, 1);
});

test("enforceBudgetLength: remaining_budget<=2 truncates to exactly the budget", () => {
  const out2 = enforceBudgetLength({ newQueue: [q("a"), q("b"), q("c"), q("d")], remainingBudget: 2, issues: [] });
  assert.deepEqual(out2.map((x) => x.alias), ["a", "b"]);
  const out1 = enforceBudgetLength({ newQueue: [q("a"), q("b"), q("c")], remainingBudget: 1, issues: [] });
  assert.deepEqual(out1.map((x) => x.alias), ["a"]);
});

test("enforceBudgetLength: a queue already within budget is untouched", () => {
  const issues: string[] = [];
  const out = enforceBudgetLength({ newQueue: [q("a"), q("b")], remainingBudget: 5, issues });
  assert.deepEqual(out.map((x) => x.alias), ["a", "b"]);
  assert.equal(issues.length, 0);
});

// --- Closer-on-final-turn gate ---------------------------------------------

test("enforceCloserOnFinalTurn: no-op when it is not the final turn", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill"), q("closer")],
    remainingBudget: 3,
    closerAlias: "closer",
    remainingQueue: [],
    issues: [],
  });
  assert.deepEqual(out.map((x) => x.alias), ["drill", "closer"]);
});

test("enforceCloserOnFinalTurn: final turn moves an out-of-place closer to the front", () => {
  const issues: string[] = [];
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill"), q("closer"), q("other")],
    remainingBudget: 1,
    closerAlias: "closer",
    remainingQueue: [],
    issues,
  });
  assert.equal(out[0].alias, "closer");
  assert.equal(issues.length, 1);
});

test("enforceCloserOnFinalTurn: final turn pulls a missing closer from the remaining queue", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill")],
    remainingBudget: 1,
    closerAlias: "closer",
    remainingQueue: [q("closer")],
    issues: [],
  });
  assert.equal(out[0].alias, "closer");
});

test("enforceCloserOnFinalTurn: no reserved closer means no-op", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill")],
    remainingBudget: 1,
    closerAlias: "(none)",
    remainingQueue: [],
    issues: [],
  });
  assert.deepEqual(out.map((x) => x.alias), ["drill"]);
});

// --- Regression: gates that already existed --------------------------------

test("clampToSignature: an off-signature axis is dropped, an in-signature one clamped", () => {
  const { deltas } = clampToSignature({ growth: 3, wellbeing: 2 }, { growth: 1 });
  assert.deepEqual(deltas, { growth: 1 }); // wellbeing dropped, growth clamped 3→1
});

test("isRelationalArc: check-in and feels-off are relational; performance is not", () => {
  assert.equal(isRelationalArc("bi_weekly_check_in"), true);
  assert.equal(isRelationalArc("something_feels_off"), true);
  assert.equal(isRelationalArc("performance_feedback"), false);
});
