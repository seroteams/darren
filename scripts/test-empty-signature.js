#!/usr/bin/env node
// Regression: a question scored with no signature (empty axis_effects) drops
// every delta as "off-signature" and books nothing for the turn. That is
// allowed, but it must surface loudly — not vanish silently.

const assert = require("node:assert/strict");
const { clampToSignature } = require("../src/queue-manager");

// Empty signature + non-zero deltas → all dropped, one loud EMPTY-SIGNATURE issue.
const { deltas, issues, overflow } = clampToSignature({ clarity: 3, growth: 1 }, {});
assert.deepEqual(deltas, {}, "all deltas dropped when signature is empty");
assert.ok(
  issues.some((i) => i.includes("EMPTY-SIGNATURE")),
  "empty-signature drop is logged loudly"
);
assert.deepEqual(
  overflow,
  [
    { axis: "clarity", raw: 3, booked: 0, reason: "empty_signature" },
    { axis: "growth", raw: 1, booked: 0, reason: "empty_signature" },
  ],
  "dropped deltas are preserved as unbooked overflow, not lost"
);

// Empty signature + no deltas → nothing to warn about (a true no-op turn).
const quiet = clampToSignature({}, {});
assert.deepEqual(quiet.deltas, {}, "no deltas booked");
assert.equal(
  quiet.issues.some((i) => i.includes("EMPTY-SIGNATURE")),
  false,
  "no warning when there were no deltas to drop"
);

// Control: a real signature still clamps and books normally.
const ok = clampToSignature({ clarity: 3, wellbeing: 2 }, { clarity: 1 });
assert.deepEqual(ok.deltas, { clarity: 1 }, "in-signature delta clamped to magnitude, off-signature dropped");
assert.equal(
  ok.issues.some((i) => i.includes("EMPTY-SIGNATURE")),
  false,
  "no empty-signature warning when a signature is present"
);
assert.deepEqual(
  ok.overflow,
  [
    { axis: "wellbeing", raw: 2, booked: 0, reason: "off_signature" },
    { axis: "clarity", raw: 3, booked: 1, reason: "clamped" },
  ],
  "clamped and off-signature signal preserved as overflow (axis/raw/booked/reason only)"
);

console.log("PASS test-empty-signature");
