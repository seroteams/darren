import { SHARED_PROMPTS } from "../_shared/prompts.ts";
import type { MeetingType } from "../_shared/meeting-type.types.ts";

// 1:1 Type — Something feels off
// Data home for this Type. Edit here to tune the type in isolation.
const meetingType: MeetingType = {
  slug: "something_feels_off",
  label: "Something feels off",
  tone_register:
    "Observation-first, opt-in, low-pressure. The manager names what they saw; the employee chooses whether and how to engage. No diagnosis, no leading, no probing for an emotion the employee hasn't named.",
  arc: [
    {
      id: "landing",
      label: "Landing",
      intent: "Surface a no-pressure space to arrive.",
      target_questions: 1,
    },
    {
      id: "observation",
      label: "Observation",
      intent: "Name the observable shift, hand them the mic.",
      target_questions: 2,
    },
    {
      id: "underneath",
      label: "Underneath",
      intent: "If they open the door, follow it — what's underneath.",
      target_questions: 2,
    },
    {
      id: "support",
      label: "Support",
      intent: "Closer. What would help, if anything, right now.",
      target_questions: 1,
    },
  ],
  anti_patterns: [
    "Naming an emotion or diagnosis the employee hasn't named themselves.",
    "Stacking 'what's wrong' probes without giving them an opt-out.",
    "Treating the meeting like a performance review.",
  ],
  // Machine-checkable subset of anti_patterns — enforced on every question by
  // backend/engine/question-eligibility.ts before it can reach the manager.
  // A question may not name a state the employee hasn't named themselves
  // (NICE NG212 / CIPD: notice and ask, never diagnose).
  forbidden_question_res: [
    /\bburn(?:ed|t)?[\s-]?out\b/i,
    /\bdepress(?:ed|ion|ing)?\b/i,
    /\banxi(?:ous|ety)\b/i,
    /\b(?:overwhelmed|stressed|disengaged)\b/i,
  ],
  // Eval rules injected into the shared eval prompt via {{TYPE_EVAL_RULES}}.
  // Was a forked final-evaluation.md; this is the only part that differed.
  eval_rules: [
    "<type_eval_rules>",
    "Something feels off briefing rules:",
    "- Observation-first, opt-in tone; no diagnosis the employee did not name.",
    "- brutal_truth_manager should coach exploratory listening, not corrective performance coaching.",
    "- next_actions should be optional support offers, not prescriptive homework.",
    "- Do not treat exploratory sessions as failed performance conversations.",
    "</type_eval_rules>",
  ].join("\n"),
  // Prompt set: inherits the shared house prompts.
  prompts: { ...SHARED_PROMPTS },
};

export default meetingType;
