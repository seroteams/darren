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
    "Performative intimacy ('the real version', 'no filter', 'real talk') — sounds like an audition, not a check-in.",
    "Pivoting to growth/career framing in a routine check-in.",
    "Generic 'how do you feel about X' instead of locating the friction.",
    "Deficit-framing questions that assume or name failure: 'broken down', 'fallen short', 'slower or harder than it should have been' — prefer neutral open frames like 'where did things get complicated' or 'what's taken more energy than expected'.",
    "Personal life or out-of-work openers ('best part of your world outside work', 'what's been good for you personally') — bi-weeklies are professional peer conversations, not pastoral check-ins.",
    "Behavioural interview questions that read like competency audits: 'Where are you taking the lead?', 'What are you doing to drive X?', 'What would make this quarter clearly successful in one sentence?' — check-ins probe situations, not character.",
  ],
  // Machine-checkable subset of anti_patterns — enforced on every question by
  // src/question-eligibility.js before it can reach the manager. Keep tight:
  // only concrete phrasings that have actually leaked (Jun 11 Machar run).
  forbidden_question_res: [
    /\b(outside (of )?work|world outside)\b/i,
    /\bgood for you personally\b/i,
    /\b(the real version|no filter|real talk)\b/i,
    /\bwhere are you taking the lead\b/i,
    /\bwhat are you doing to drive\b/i,
    /\bclearly successful\b[\s\S]{0,60}\bone sentence\b/i,
  ],
  // Prompt set: inherits the shared house prompts. Override a slot to fork.
  prompts: { ...SHARED_PROMPTS },
};
