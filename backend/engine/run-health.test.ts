// H3 — degradation alarm. buildRunHealth summarises a single run's quiet
// failures (planner throws + evaluation fallback) so the *rate* is visible.
import test from "node:test";
import assert from "node:assert/strict";
import { buildRunHealth, PLANNER_FAILED_NOTE } from "./run-health.ts";

const ok = { note: "moving well" };
const failed = { note: PLANNER_FAILED_NOTE };

test("healthy run: nothing degraded", () => {
  const h = buildRunHealth([ok, ok, ok], false);
  assert.equal(h.planner_failed_turns, 0);
  assert.equal(h.total_turns, 3);
  assert.equal(h.evaluation_degraded, false);
  assert.equal(h.degraded, false);
});

test("counts the turns whose planner failed", () => {
  const h = buildRunHealth([ok, failed, ok, failed], false);
  assert.equal(h.planner_failed_turns, 2);
  assert.equal(h.total_turns, 4);
  assert.equal(h.degraded, true);
});

test("evaluation fallback alone marks the run degraded", () => {
  const h = buildRunHealth([ok, ok], true);
  assert.equal(h.planner_failed_turns, 0);
  assert.equal(h.evaluation_degraded, true);
  assert.equal(h.degraded, true);
});

test("empty / missing transcript is safe", () => {
  const h = buildRunHealth([], false);
  assert.equal(h.total_turns, 0);
  assert.equal(h.degraded, false);

  const h2 = buildRunHealth(null, true);
  assert.equal(h2.total_turns, 0);
  assert.equal(h2.planner_failed_turns, 0);
  assert.equal(h2.degraded, true);
});
