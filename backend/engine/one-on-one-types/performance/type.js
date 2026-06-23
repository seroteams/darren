const { SHARED_PROMPTS } = require("../_shared/prompts");

// 1:1 Type — Performance & feedback
// Data home for this Type. Edit here to tune the type in isolation.
module.exports = {
  slug: "performance_feedback",
  label: "Performance & feedback",
  tone_register:
    "Direct, adult-to-adult. No softening-as-cushioning. The manager has a view; the employee has a view; the meeting reconciles them. Name things plainly without dressing them up.",
  arc: [
    {
      id: "self_read",
      label: "Self-read",
      intent: "Their read of the last stretch before any manager view lands.",
      target_questions: 1,
    },
    {
      id: "evidence",
      label: "Evidence",
      intent: "Anchor on observable moments, not impressions.",
      target_questions: 2,
    },
    {
      id: "gap_naming",
      label: "Gap naming",
      intent: "Name the specific gap or pattern at issue.",
      target_questions: 2,
    },
    {
      id: "cause",
      label: "Cause",
      intent: "What's driving it from their side — capability, clarity, context, or capacity.",
      target_questions: 2,
    },
    {
      id: "commit",
      label: "Commit",
      intent: "Closer. A concrete behavioural change with a date.",
      target_questions: 1,
    },
  ],
  anti_patterns: [
    "Softening the gap so much it disappears.",
    "Leading the employee toward the manager's prewritten conclusion.",
    "Closing on 'how do you feel about that' instead of a concrete commitment.",
  ],
  eval_rules: [
    "<type_eval_rules>",
    "Performance & feedback — manager briefing:",
    "- Anchor headline and summary on observable quality bar: edge cases, handoff completeness, escalation triggers, release/payment risk.",
    "- Do not treat communication as the primary story unless the transcript has explicit reviewer/stakeholder confusion.",
    "- When selected focus is quality, keep diagnosis on defect prevention and handoff — not generic communication themes.",
    "</type_eval_rules>",
  ].join("\n"),
  prompts: { ...SHARED_PROMPTS },
};
