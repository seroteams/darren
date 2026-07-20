// Scoring-gate instrumentation (better-reads Phase 1, detect-only).
// The shallow gate must keep zeroing exactly as before; these tests pin the
// new overflow recording — what was zeroed, and whether it would have been
// protect-eligible — without any behaviour change to booked scores.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isShallowAnswer,
  isTerseButConcrete,
  applyShallowGate,
  type ShallowOverflowEntry,
} from "./delta-gates.ts";

// --- isTerseButConcrete: the boundary --------------------------------------

test("terse two-token note with a real content word is concrete", () => {
  assert.equal(isTerseButConcrete("Shipped payments-fix"), true);
});

test("single concrete word is concrete", () => {
  assert.equal(isTerseButConcrete("Promoted."), true);
});

test("filler-only stays non-concrete", () => {
  assert.equal(isTerseButConcrete("fine"), false);
  assert.equal(isTerseButConcrete("not bad"), false);
});

test("low-signal-only words stay non-concrete", () => {
  assert.equal(isTerseButConcrete("ok good"), false);
  assert.equal(isTerseButConcrete("same really"), false);
});

test("reporting wrapper with no content stays non-concrete", () => {
  assert.equal(isTerseButConcrete("yeah he said things are ok"), false);
});

test("skips and empties are non-concrete", () => {
  assert.equal(isTerseButConcrete("(skipped)"), false);
  assert.equal(isTerseButConcrete(""), false);
  assert.equal(isTerseButConcrete(null), false);
  assert.equal(isTerseButConcrete(undefined), false);
});

test("a longer note is not terse, so not terse-but-concrete", () => {
  // 4+ tokens never trips the shallow token floor, so the protect question
  // does not arise — the gate wouldn't zero it in the first place.
  assert.equal(isTerseButConcrete("Shipped the payments fix"), false);
});

// --- applyShallowGate: overflow recording, zeroing unchanged ----------------

function gateArgs(lastAnswer: string) {
  return { lastAnswer, note: "", issues: [] as string[] };
}

test("shallow answer still zeroes every delta (behaviour unchanged)", () => {
  const deltas: Record<string, number> = { clarity: 2, trust: -1 };
  const fired = applyShallowGate(deltas, gateArgs("fine"));
  assert.equal(fired, true);
  assert.deepEqual(deltas, { clarity: 0, trust: 0 });
});

test("records one overflow entry per zeroed axis, axis/raw/booked/reason only", () => {
  const deltas: Record<string, number> = { clarity: 2, trust: -1, workload: 0 };
  const overflow: ShallowOverflowEntry[] = [];
  applyShallowGate(deltas, { ...gateArgs("fine"), overflow });
  assert.equal(overflow.length, 2); // workload was already 0 — not recorded
  const clarity = overflow.find((o) => o.axis === "clarity");
  const trust = overflow.find((o) => o.axis === "trust");
  assert.deepEqual(clarity, { axis: "clarity", raw: 2, booked: 0, reason: "shallow_zeroed" });
  assert.deepEqual(trust, { axis: "trust", raw: -1, booked: 0, reason: "shallow_zeroed" });
});

// --- Phase 2: the protect gate is ARMED ------------------------------------
// A terse-but-concrete answer keeps the model's own positive deltas (a
// concrete "Shipped X" corroborates the model's upward read); negatives are
// still zeroed (a 2-token note is not evidence of a problem).

test("terse-but-concrete keeps model-proposed positives, still zeroes negatives", () => {
  const deltas: Record<string, number> = { momentum: 2, clarity: -1 };
  const overflow: ShallowOverflowEntry[] = [];
  const issues: string[] = [];
  applyShallowGate(deltas, { lastAnswer: "Shipped payments-fix", note: "", issues, overflow });
  assert.deepEqual(deltas, { momentum: 2, clarity: 0 });
  // Kept delta is booked → not in overflow; zeroed negative is recorded.
  assert.deepEqual(overflow, [{ axis: "clarity", raw: -1, booked: 0, reason: "shallow_zeroed" }]);
  // The protection is surfaced in issues, never silent.
  assert.ok(issues.some((i) => i.includes("protected momentum +2")));
});

test("honesty invariant: the gate never invents or increases a delta", () => {
  // No positive proposed → none can appear.
  const onlyNeg: Record<string, number> = { clarity: -2 };
  applyShallowGate(onlyNeg, gateArgs("Shipped payments-fix"));
  assert.deepEqual(onlyNeg, { clarity: 0 });
  // Magnitude never grows.
  const pos: Record<string, number> = { momentum: 1 };
  applyShallowGate(pos, gateArgs("Shipped payments-fix"));
  assert.deepEqual(pos, { momentum: 1 });
});

test("positive delta on a filler answer is NOT protect-eligible", () => {
  const deltas: Record<string, number> = { momentum: 2 };
  const overflow: ShallowOverflowEntry[] = [];
  applyShallowGate(deltas, { ...gateArgs("fine"), overflow });
  assert.equal(overflow[0]?.reason, "shallow_zeroed");
});

test("non-shallow answer records nothing and zeroes nothing", () => {
  const deltas: Record<string, number> = { clarity: 2 };
  const overflow: ShallowOverflowEntry[] = [];
  const fired = applyShallowGate(deltas, {
    ...gateArgs("She has been pairing with the new hire and it is going well"),
    overflow,
  });
  assert.equal(fired, false);
  assert.deepEqual(deltas, { clarity: 2 });
  assert.equal(overflow.length, 0);
});

test("works without a sink (back-compat call shape)", () => {
  const deltas: Record<string, number> = { clarity: 2 };
  const fired = applyShallowGate(deltas, gateArgs("fine"));
  assert.equal(fired, true);
  assert.deepEqual(deltas, { clarity: 0 });
});

test("[SHALLOW] note marker still fires the gate and records overflow", () => {
  const deltas: Record<string, number> = { trust: 1 };
  const overflow: ShallowOverflowEntry[] = [];
  applyShallowGate(deltas, {
    lastAnswer: "He mentioned the release went out on time",
    note: "[SHALLOW] second-hand, no depth",
    issues: [],
    overflow,
  });
  assert.deepEqual(deltas, { trust: 0 });
  // Marker-driven shallow on a non-terse answer: plain shallow_zeroed, never
  // protect-eligible (protect-eligibility is about the ANSWER being concrete).
  assert.equal(overflow[0]?.reason, "shallow_zeroed");
});
