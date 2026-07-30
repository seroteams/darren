import { test } from "node:test";
import assert from "node:assert/strict";
import { checkQuestionEligibility } from "./question-eligibility.ts";
import { pickSeedOverflow } from "./closer.ts";
import { enforceAxisCoverage } from "./axis-coverage.ts";
import type { Question } from "../shared/question.types.ts";
import type { AxisState } from "../shared/session.types.ts";

// user-test-fixes P3 (Machar, 2026-07-29): stock (_seed) questions ignored the
// meeting type — "What would a good quarter look like…" landed in a Performance
// & feedback run ("that's a weak question for performance and feedback").
// Seeds now carry `fits_meetings` (type slugs or labels); the central gate
// rejects an off-fit stock question on every pick path. Questions WITHOUT the
// field (the whole generated bank) are untouched.

const offFitSeed = {
  alias: "q_seed_test_recovery",
  name: "When you're not working, are you actually recovering?",
  label: "Recovery",
  description: "Rest vs downtime.",
  fits_meetings: ["bi_weekly_check_in", "something_feels_off"],
};

test("gate rejects a stock question whose fits_meetings excludes the meeting", () => {
  const check = checkQuestionEligibility(offFitSeed, { meetingType: "Performance & feedback" });
  assert.equal(check.ok, false);
  if (!check.ok) assert.equal(check.reason, "off_meeting_fit");
});

test("gate accepts the same question in a meeting it fits (slug)", () => {
  assert.equal(checkQuestionEligibility(offFitSeed, { meetingType: "Bi-weekly check-in" }).ok, true);
});

test("gate accepts fits_meetings written as labels too", () => {
  const q = { ...offFitSeed, fits_meetings: ["Performance & feedback"] };
  assert.equal(checkQuestionEligibility(q, { meetingType: "Performance & feedback" }).ok, true);
});

test("a question without fits_meetings is untouched (generated bank)", () => {
  const q = { alias: "q_gen_1", name: "Where does the beta test stand today?" };
  assert.equal(checkQuestionEligibility(q, { meetingType: "Performance & feedback" }).ok, true);
});

test("an unknown meeting type fails open — never blocks on bad context", () => {
  assert.equal(checkQuestionEligibility(offFitSeed, { meetingType: "Some Future Type" }).ok, true);
});

test("seed overflow skips an off-fit seed and serves the next fitting one", () => {
  const fitting = {
    alias: "q_seed_test_feedback",
    name: "What's the last piece of hard feedback you got?",
    label: "Feedback intake",
    description: "",
    fits_meetings: ["performance_feedback"],
  };
  const pick = pickSeedOverflow([offFitSeed, fitting], new Set(), {
    meetingType: "Performance & feedback",
  });
  assert.equal(pick?.alias, "q_seed_test_feedback");
});

test("axis coverage refuses an off-fit stock question and leaves the queue honest", () => {
  const issues: string[] = [];
  const axisState = {
    wellbeing: { history: [] },
    engagement: { history: [{}] },
    clarity: { history: [{}] },
    growth: { history: [{}] },
  } as unknown as AxisState;
  const newQueue = [
    { alias: "q_a", name: "How is the beta test sequenced?", axis_effects: { clarity: 1 } },
  ] as unknown as Question[];
  const out = enforceAxisCoverage({
    newQueue,
    axisState,
    turnNumber: 5,
    issues,
    meetingType: "Performance & feedback",
    bankLoader: () => [
      { ...offFitSeed, axis_effects: { wellbeing: 3 }, source: "seed" },
    ],
  });
  assert.equal(out.length, 1, "off-fit seed must not be inserted");
  assert.ok(issues.some((i) => i.includes("off_meeting_fit")), `expected an off_meeting_fit issue, got: ${issues.join(" | ")}`);
});

test("axis coverage still inserts a FITTING stock question for the bare axis", () => {
  const issues: string[] = [];
  const axisState = {
    wellbeing: { history: [] },
    engagement: { history: [{}] },
    clarity: { history: [{}] },
    growth: { history: [{}] },
  } as unknown as AxisState;
  const newQueue = [
    { alias: "q_a", name: "How is the beta test sequenced?", axis_effects: { clarity: 1 } },
  ] as unknown as Question[];
  const out = enforceAxisCoverage({
    newQueue,
    axisState,
    turnNumber: 5,
    issues,
    meetingType: "Bi-weekly check-in",
    bankLoader: () => [
      { ...offFitSeed, axis_effects: { wellbeing: 3 }, source: "seed" },
    ],
  });
  assert.equal(out.length, 2, "fitting seed should be inserted for the bare axis");
  assert.equal(out[0]?.alias, "q_seed_test_recovery");
});
