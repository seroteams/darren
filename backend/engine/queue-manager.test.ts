import test from "node:test";
import assert from "node:assert/strict";
import { enforceCloserOnFinalTurn, enforceBudgetLength, clampToSignature, enforceDrillCap, enforceThreadFollow } from "./queue-manager.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import type { Question } from "../shared/question.types.ts";
import type { Arc } from "./queue-constants.ts";

const emptyArc = { arc: [] } as unknown as Arc; // no remaining stages → isolates the drill-cap slice loop

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
  assert.equal(out[0]?.alias, "closer");
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
  assert.equal(out[0]?.alias, "closer");
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

// --- Drill cap: pin the runtime thread-follow (thread-follow Phase 1) -------

const tf = (alias: string, stage: string): Question =>
  ({ alias, source: "planner_added", label: "Thread follow", stage } as unknown as Question);
const drill = (alias: string, stage: string): Question =>
  ({ alias, source: "planner_added", stage } as unknown as Question);

test("enforceDrillCap: a runtime thread-follow at slot 0 is pinned, not eaten as a same-stage drill", () => {
  const issues: string[] = [];
  const out = enforceDrillCap({
    newQueue: [tf("follow", "explore"), drill("drill", "explore"), q("keep")],
    lastQuestion: { stage: "explore" } as unknown as Question,
    remainingQueue: [],
    consecutiveDrillCount: 2,
    transcript: [],
    arc: emptyArc,
    issues,
  });
  // The follow survives at the front; the real same-stage drill behind it is still capped.
  assert.equal(out[0]?.alias, "follow");
  assert.ok(!out.some((x) => x.alias === "drill"));
  assert.ok(issues.some((i) => i.includes("drill cap")));
});

test("enforceDrillCap: without a thread-follow, a same-stage drill at the front is still capped", () => {
  const issues: string[] = [];
  const out = enforceDrillCap({
    newQueue: [drill("drill", "explore"), q("keep")],
    lastQuestion: { stage: "explore" } as unknown as Question,
    remainingQueue: [],
    consecutiveDrillCount: 2,
    transcript: [],
    arc: emptyArc,
    issues,
  });
  assert.deepEqual(out.map((x) => x.alias), ["keep"]);
  assert.ok(issues.some((i) => i.includes("drill cap")));
});

// --- Thread-follow: mint under drill pressure, but never chain (Phase 2) ----

// ≥5 words, not shallow, yet no clause survives filler-stripping to a 3-word
// span — so buildThreadFollowQuestion returns null and pushes "no stem grounded"
// WITHOUT writing a question file. That issue is our disk-free proof of whether
// the guard let the answer through to the builder.
const UNMIRRORABLE = "and but so um uh and but";

test("enforceThreadFollow: a new thread still reaches the builder under drill pressure", () => {
  const issues: string[] = [];
  enforceThreadFollow({
    newQueue: [q("planned")],
    lastAnswer: UNMIRRORABLE,
    lastQuestion: drill("d1", "explore"), // a normal same-stage drill, not a thread-follow
    remainingBudget: 6, // drill count no longer gates the follow — only "was the last Q itself a follow?"
    askedNames: [],
    transcript: [],
    issues,
  });
  assert.ok(issues.some((i) => i.includes("no stem grounded")));
});

test("enforceThreadFollow: a thread-follow is never chained onto another thread-follow", () => {
  const issues: string[] = [];
  const out = enforceThreadFollow({
    newQueue: [q("planned")],
    lastAnswer: UNMIRRORABLE,
    lastQuestion: tf("prev-follow", "explore"), // last question was itself a thread-follow
    remainingBudget: 6,
    askedNames: [],
    transcript: [],
    issues,
  });
  assert.deepEqual(out.map((x) => x.alias), ["planned"]); // unchanged
  assert.equal(issues.length, 0); // bailed before the builder — no injection, no "no stem grounded"
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
