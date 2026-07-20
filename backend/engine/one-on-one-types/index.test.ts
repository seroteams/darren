import { test } from "node:test";
import assert from "node:assert/strict";
import { arcBudget, arcBudgetDefault, getArc } from "./index.ts";

// arcBudget = the meeting type's designed length (sum of each arc phase's
// target_questions). This is what a session's totalBudget now follows, so the
// light relational arcs stop at 6 instead of the old flat 9.
test("arcBudget sums target_questions per type", () => {
  assert.equal(arcBudget("bi_weekly_check_in"), 6);
  assert.equal(arcBudget("something_feels_off"), 6);
  assert.equal(arcBudget("onboarding_check_in"), 6);
  assert.equal(arcBudget("performance_feedback"), 7);
  assert.equal(arcBudget("growth_career_plan"), 8);
});

test("arcBudget resolves by label too", () => {
  assert.equal(arcBudget("Bi-weekly check-in"), 6);
  assert.equal(arcBudget("Growth & career plan"), 8);
});

// Overlay-free variant for offline callers (fixture validators) — same default
// lengths, no overlay-cache hydration needed.
test("arcBudgetDefault sums the code-default arc without overlays", () => {
  assert.equal(arcBudgetDefault("bi_weekly_check_in"), 6);
  assert.equal(arcBudgetDefault("something_feels_off"), 6);
  assert.equal(arcBudgetDefault("onboarding_check_in"), 6);
  assert.equal(arcBudgetDefault("performance_feedback"), 7);
  assert.equal(arcBudgetDefault("growth_career_plan"), 8);
  assert.equal(arcBudgetDefault("Growth & career plan"), 8);
});

// Built on the overlay-aware getArc, not the static default map, so a manager's
// saved arc edit changes the budget with no restart.
test("arcBudget tracks the overlay-aware getArc", () => {
  for (const slug of ["bi_weekly_check_in", "growth_career_plan"]) {
    const fromArc = getArc(slug).arc.reduce((n, s) => n + (s.target_questions || 0), 0);
    assert.equal(arcBudget(slug), fromArc);
  }
});
