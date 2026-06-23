#!/usr/bin/env node
// Regression: snapping a raw delta to the allowed set must resolve ties
// deterministically toward zero (lower magnitude) for BOTH signs — not by
// accident of array order, which used to send +2 → 1 but -2 → -3.

const assert = require("node:assert/strict");
const { snapToAllowedDelta } = require("../backend/engine/queue-manager");

// Exact ties snap toward zero, symmetrically.
assert.equal(snapToAllowedDelta(2), 1, "+2 snaps to +1 (toward zero)");
assert.equal(snapToAllowedDelta(-2), -1, "-2 snaps to -1 (toward zero), not -3");

// Non-ties snap to the genuine nearest.
assert.equal(snapToAllowedDelta(2.6), 3, "2.6 snaps to nearest 3");
assert.equal(snapToAllowedDelta(-0.4), 0, "-0.4 snaps to nearest 0");
assert.equal(snapToAllowedDelta(1), 1, "exact allowed value is unchanged");

// Non-finite input is a safe zero.
assert.equal(snapToAllowedDelta(NaN), 0, "NaN → 0");
assert.equal(snapToAllowedDelta(undefined), 0, "undefined → 0");

console.log("PASS test-delta-snap");
