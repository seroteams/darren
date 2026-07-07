import test from "node:test";
import assert from "node:assert/strict";
import { toAxisObject, nameWordCount, plannerNameIssue } from "./reconcile-queue.ts";

// Item-shape gates (Phase 1). These pure predicates are the decision logic the
// reconcile loop calls to drop malformed planner items before they materialise.

// --- Axis-id whitelist -----------------------------------------------------
// toAxisObject already narrows to the four real axes; these lock that a bad id
// is silently stripped and an all-bad list collapses to empty (which the
// reconcile loop then treats as "no valid axis" → drop).

test("toAxisObject: strips an off-whitelist axis id, keeps the real ones", () => {
  const out = toAxisObject([
    { axis: "growth", delta: 3 },
    { axis: "vibes", delta: 1 },
  ]);
  assert.deepEqual(out, { growth: 3 });
});

test("toAxisObject: an all-invalid axis list collapses to empty", () => {
  assert.deepEqual(toAxisObject([{ axis: "vibes", delta: 1 }]), {});
  assert.deepEqual(toAxisObject([]), {});
});

// --- Name word cap ---------------------------------------------------------

test("nameWordCount: counts words, tolerant of extra whitespace", () => {
  assert.equal(nameWordCount("  where is your energy   at  "), 5);
  assert.equal(nameWordCount(""), 0);
  assert.equal(nameWordCount(null), 0);
});

const words = (n: number) =>
  Array.from({ length: n }, (_, i) => `w${i + 1}`).join(" ");

test("plannerNameIssue: empty or blank name is dropped", () => {
  assert.match(plannerNameIssue("") ?? "", /empty/);
  assert.match(plannerNameIssue("   ") ?? "", /empty/);
});

test("plannerNameIssue: 18 words is allowed, 19 is over the cap", () => {
  assert.equal(plannerNameIssue(words(18)), null);
  assert.match(plannerNameIssue(words(19)) ?? "", /18 words/);
});

test("plannerNameIssue: a normal short question passes", () => {
  assert.equal(plannerNameIssue("Where is your energy at, and what's driving that?"), null);
});
