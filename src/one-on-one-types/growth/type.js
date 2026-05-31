const path = require("node:path");
const { SHARED_PROMPTS } = require("../_shared/prompts");

// 1:1 Type — Growth & career plan
// Data home for this Type. Edit here to tune the type in isolation.
module.exports = {
  slug: "growth_career_plan",
  label: "Growth & career plan",
  tone_register:
    "Aspirational, forward-leaning, generative. Future-tense. The employee is the protagonist of their own next chapter; the manager is a coach, not an HR checkbox. Make 'imagine', 'what would', 'where do you want' do the heavy lifting.",
  arc: [
    {
      id: "anchor",
      label: "Anchor",
      intent: "Where they are now in role — what's solid, what's stretching.",
      target_questions: 2,
    },
    {
      id: "aspiration",
      label: "Aspiration",
      intent: "Where they want to go, concretely — named roles, named scopes, named outcomes.",
      target_questions: 2,
    },
    {
      id: "gap",
      label: "Gap",
      intent: "What's between here and there — skills, exposure, decisions, time.",
      target_questions: 2,
    },
    {
      id: "investment",
      label: "Investment",
      intent: "What has to change from them, from you as manager, from the org — and what gets traded off.",
      target_questions: 2,
    },
    {
      id: "commitment",
      label: "Commitment",
      intent: "Closer. One concrete next move before the next conversation.",
      target_questions: 1,
    },
  ],
  anti_patterns: [
    "Round-robin axis coverage that never deepens a single thread.",
    "Asking 'what skill do you want to develop' before knowing where they want to go.",
    "Closing on 'what support do you need from me' without first earning the gap and the investment.",
    "Reframing growth questions as role-clarity or feedback questions — that's a different meeting type.",
  ],
  // Prompt set: inherits the shared house prompts, except evaluation which is
  // forked here so the Growth next-plan mandate is baked in (not gated in-prompt).
  prompts: {
    ...SHARED_PROMPTS,
    evaluation: path.join(__dirname, "prompts", "final-evaluation.md"),
  },
};
