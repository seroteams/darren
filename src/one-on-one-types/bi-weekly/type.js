const { SHARED_PROMPTS } = require("../_shared/prompts");

// 1:1 Type — Bi-weekly check-in
// Data home for this Type. Edit here to tune the type in isolation.
module.exports = {
  slug: "bi_weekly_check_in",
  label: "Bi-weekly check-in",
  tone_register:
    "Casual, fluent, peer-tempered. The manager is checking in, not auditing. Short questions, plain words. Willing to go deeper if something opens, but no agenda performance.",
  arc: [
    {
      id: "pulse",
      label: "Pulse",
      intent: "How is the last stretch sitting — fast read.",
      target_questions: 1,
    },
    {
      id: "friction",
      label: "Friction",
      intent: "Where is anything snagging — work, energy, people.",
      target_questions: 2,
    },
    {
      id: "momentum",
      label: "Momentum",
      intent: "What's moving forward and what's stuck.",
      target_questions: 2,
    },
    {
      id: "lift",
      label: "Lift",
      intent: "Closer. What would make the next two weeks lighter or sharper.",
      target_questions: 1,
    },
  ],
  anti_patterns: [
    "Agenda-heavy openers that read like a HR form.",
    "Pivoting to growth/career framing in a routine check-in.",
    "Generic 'how do you feel about X' instead of locating the friction.",
  ],
  // Prompt set: inherits the shared house prompts. Override a slot to fork.
  prompts: { ...SHARED_PROMPTS },
};
