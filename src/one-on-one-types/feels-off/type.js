const path = require("node:path");
const { SHARED_PROMPTS } = require("../_shared/prompts");

// 1:1 Type — Something feels off
// Data home for this Type. Edit here to tune the type in isolation.
module.exports = {
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
  // Prompt set: inherits the shared house prompts. Override evaluation for feels-off tone.
  prompts: {
    ...SHARED_PROMPTS,
    evaluation: path.join(__dirname, "prompts", "final-evaluation.md"),
  },
};
