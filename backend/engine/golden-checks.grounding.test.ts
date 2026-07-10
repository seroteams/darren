// Positive briefing-grounding checks (engine-hardening Phase 3).
// Warn-level: asserts the briefing names the person and cites real data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runManagerBriefingGroundingChecks } from "./golden-checks.ts";
import type { Briefing } from "../shared/briefing.types.ts";

const engagementRead = {
  read_status: "read" as const,
  observed_shift: "",
  evidence: [],
  missing_evidence: "",
  recommended_action: "",
  watch_next: "",
};

function makeBriefing(over: Partial<Briefing>): Briefing {
  return {
    headline: "",
    summary_bullets: [],
    understanding_paragraph: "",
    axes: [],
    brutal_truth_employee: "",
    brutal_truth_manager: "",
    next_actions: [],
    watch_for: [],
    engagement_read: engagementRead,
    ...over,
  };
}

test("grounded briefing (names person + one axis read) produces no failures", () => {
  const b = makeBriefing({
    headline: "Priya is stretched thin on the billing rewrite",
    understanding_paragraph: "Priya has carried the migration mostly alone.",
    axes: [
      { id: "engagement", score: 3, meaning: "invested but tired", read_status: "read" },
      { id: "wellbeing", score: 0, meaning: "", read_status: "not_read", not_read_reason: "no_history" },
    ],
  });
  const failures = runManagerBriefingGroundingChecks(b, { name: "Priya Sharma" });
  assert.deepEqual(failures, []);
});

test("nameless + all-not_read briefing fails both checks", () => {
  const b = makeBriefing({
    headline: "The report seems disengaged this cycle",
    understanding_paragraph: "No clear signal surfaced this session.",
    axes: [
      { id: "engagement", score: 0, meaning: "", read_status: "not_read", not_read_reason: "no_history" },
      { id: "wellbeing", score: 0, meaning: "", read_status: "not_read", not_read_reason: "no_history" },
    ],
  });
  const failures = runManagerBriefingGroundingChecks(b, { name: "Priya Sharma" });
  assert.equal(failures.length, 2);
  assert.ok(failures.some((f) => /name/i.test(f)), "expected a name failure");
  assert.ok(failures.some((f) => /read|data|signal/i.test(f)), "expected a data failure");
});

test("empty ctx.name skips the name check", () => {
  const b = makeBriefing({
    headline: "engaged and steady",
    axes: [{ id: "engagement", score: 2, meaning: "steady", read_status: "read" }],
  });
  assert.deepEqual(runManagerBriefingGroundingChecks(b, { name: "" }), []);
});

test("fallback briefing (generation_failed) skips the data check", () => {
  const b = makeBriefing({
    headline: "Priya — briefing unavailable",
    generation_failed: true,
    axes: [{ id: "engagement", score: 0, meaning: "", read_status: "not_read", not_read_reason: "no_history" }],
  });
  // name present, data check skipped on the known degraded path → no failures
  assert.deepEqual(runManagerBriefingGroundingChecks(b, { name: "Priya" }), []);
});
