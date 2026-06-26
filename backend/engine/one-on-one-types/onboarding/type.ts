import { SHARED_PROMPTS } from "../_shared/prompts.ts";
import type { MeetingType } from "../_shared/meeting-type.types.ts";

// 1:1 Type — Onboarding check-in
// Data home for this Type. Edit here to tune the type in isolation.
const meetingType: MeetingType = {
  slug: "onboarding_check_in",
  label: "Onboarding check-in",
  tone_register:
    "Welcoming, orienting, low-bar. The new joiner is still forming a map of the place — make it safe to admit confusion. Short, concrete, helpful. The manager is a guide removing friction, not assessing performance.",
  arc: [
    {
      id: "settling",
      label: "Settling",
      intent: "How they're landing — environment, tools, people, the basics.",
      target_questions: 1,
    },
    {
      id: "orientation",
      label: "Orientation",
      intent: "What's still unclear — role, expectations, who's who, how things work here.",
      target_questions: 2,
    },
    {
      id: "blockers",
      label: "Blockers",
      intent: "What's slowing them down or missing to actually do the work.",
      target_questions: 2,
    },
    {
      id: "connection",
      label: "Connection",
      intent: "Closer. Who they've connected with, and what support to line up next.",
      target_questions: 1,
    },
  ],
  anti_patterns: [
    "Evaluating performance in the first weeks instead of removing friction.",
    "Assuming silence means things are fine — new joiners under-report blockers.",
    "Overloading them with information instead of surfacing what they actually need next.",
  ],
  // Eval rules injected into the shared eval prompt via {{TYPE_EVAL_RULES}}.
  // Was a forked final-evaluation.md; this is the only part that differed.
  eval_rules: [
    "<type_eval_rules>",
    "Onboarding check-in briefing rules:",
    "- Friction-removal tone only; never performance assessment or deficit verdict language.",
    "- brutal_truth fields should name confusion/blockers, not competency gaps.",
    "- next_actions must be support touchpoints (pairing, docs, intros, escalation paths).",
    "- Avoid harsh negative axis framing unless transcript shows clear distress.",
    "</type_eval_rules>",
  ].join("\n"),
  // Prompt set: inherits the shared house prompts.
  prompts: { ...SHARED_PROMPTS },
};

export default meetingType;
