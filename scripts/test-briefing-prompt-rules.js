#!/usr/bin/env node
// Two promises the final-evaluation prompt makes were previously unchecked:
// (1) a present agenda carry-forward must be acknowledged in exactly one place
//     (final-evaluation.md <agenda_carry_forward_rule>);
// (2) a partial read must include a next_action about re-running/extending the
//     conversation (final-evaluation.md <shallow_answer_handling>).
// Production warns; this test hard-fails so drift can't pass CI.

const assert = require("node:assert/strict");
const { validateBriefingPromptRules } = require("../backend/engine/reviewer.ts");

const agenda = { summary: "the pricing migration timeline", covered: false };

const acknowledgedOnce = {
  summary_bullets: [
    "He raised the pricing migration timeline and it was left unaddressed.",
    "Energy is steady but ownership of the next quarter is unclear.",
  ],
  next_actions: [
    { when: "this week", action: "Share the revised project scope with the team" },
  ],
};

const notAcknowledged = {
  summary_bullets: ["Energy is steady but ownership of the next quarter is unclear."],
  next_actions: [
    { when: "this week", action: "Share the revised project scope with the team" },
  ],
};

const acknowledgedTwice = {
  summary_bullets: [
    "He raised the pricing migration timeline and it was left unaddressed.",
  ],
  next_actions: [
    { when: "next 1:1", action: "Close the loop on the pricing migration timeline he raised" },
  ],
};

// Agenda acknowledged exactly once → passes.
{
  const r = validateBriefingPromptRules(acknowledgedOnce, { agenda });
  assert.equal(r.passed, true, "single acknowledgement passes");
}

// Agenda present but never acknowledged → fails.
{
  const r = validateBriefingPromptRules(notAcknowledged, { agenda });
  assert.equal(r.passed, false, "missing acknowledgement fails");
  assert.ok(
    r.issues.some((i) => i.includes("not acknowledged")),
    "issue names the missing acknowledgement"
  );
}

// Agenda acknowledged in two places → fails (rule says exactly one).
{
  const r = validateBriefingPromptRules(acknowledgedTwice, { agenda });
  assert.equal(r.passed, false, "double acknowledgement fails");
  assert.ok(r.issues.some((i) => i.includes("2 places")), "issue counts the places");
}

// No agenda → agenda rule is silent.
{
  const r = validateBriefingPromptRules(notAcknowledged, { agenda: { summary: null } });
  assert.equal(r.passed, true, "no agenda, no agenda issue");
}

// Partial read with a re-run action → passes.
{
  const briefing = {
    summary_bullets: [],
    next_actions: [
      { when: "next 1:1", action: "Re-ask the growth question with a concrete prompt" },
      { when: "today", action: "Email the timeline" },
    ],
  };
  const r = validateBriefingPromptRules(briefing, { readQuality: { partial_read: true } });
  assert.equal(r.passed, true, "partial read with re-run action passes");
}

// Partial read without a re-run action → fails. Timing alone ("next 1:1")
// must NOT count — any action can carry that timing.
{
  const briefing = {
    summary_bullets: [],
    next_actions: [
      { when: "next 1:1", action: "Email the project timeline to the team" },
      { when: "today", action: "Confirm the sprint scope" },
    ],
  };
  const r = validateBriefingPromptRules(briefing, { readQuality: { partial_read: true } });
  assert.equal(r.passed, false, "partial read without re-run action fails");
  assert.ok(
    r.issues.some((i) => i.includes("re-running")),
    "issue names the missing re-run action"
  );
}

// Full read → re-run rule is silent.
{
  const briefing = { summary_bullets: [], next_actions: [{ when: "today", action: "Email the timeline" }] };
  const r = validateBriefingPromptRules(briefing, { readQuality: { partial_read: false } });
  assert.equal(r.passed, true, "full read, no re-run requirement");
}

console.log("PASS test-briefing-prompt-rules");
