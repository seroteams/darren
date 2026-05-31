const { SHARED_PROMPTS } = require("../_shared/prompts");

// 1:1 Type — Onboarding check-in
// Data home for this Type. Edit here to tune the type in isolation.
module.exports = {
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
  // Prompt set: inherits the shared house prompts. Override a slot to fork.
  prompts: { ...SHARED_PROMPTS },
};
