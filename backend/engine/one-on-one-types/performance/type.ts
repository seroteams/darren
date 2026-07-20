import { SHARED_PROMPTS } from "../_shared/prompts.ts";
import type { MeetingType } from "../_shared/meeting-type.types.ts";

// 1:1 Type — Performance & feedback
// Data home for this Type. Edit here to tune the type in isolation.
const meetingType: MeetingType = {
  slug: "performance_feedback",
  label: "Performance & feedback",
  tone_register:
    "Direct, adult-to-adult, task-directed. The manager has a view; the employee has a view; the meeting reconciles them. Name the work gap plainly — the task, the artefact, the moment — never the person. No vague sugar-coating, no trait talk.",
  arc: [
    {
      id: "self_read",
      label: "Self-read",
      intent: "Their own read of the stretch first — their view, not the verdict — before any manager evidence lands.",
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
      target_questions: 1,
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
    "Person or trait-coded questions ('you are careless', 'your attitude') — feedback stays on the task and the work, never the person (Kluger & DeNisi: feedback fails when attention moves to the self).",
  ],
  // Machine-checkable subset of anti_patterns — enforced on every question by
  // backend/engine/question-eligibility.ts before it can reach the manager.
  // Keep tight: concrete person/trait phrasings only; the task-vs-person rule
  // itself lives in the tone_register and the prompts.
  forbidden_question_res: [
    /\byou(?:'re| are)\s+(?:just\s+|simply\s+|too\s+)?(?:careless|lazy|sloppy|unreliable|unmotivated|disorganis|disorganiz)/i,
    /\b(?:as a person|your personality|your character|your attitude|your work ethic)\b/i,
    /\b(?:a|an)\s+(?:careless|lazy|sloppy|unreliable)\s+(?:person|worker|employee)\b/i,
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

export default meetingType;
