import { SHARED_PROMPTS } from "../_shared/prompts.ts";
import type { MeetingType } from "../_shared/meeting-type.types.ts";

// 1:1 Type — Growth & career plan
// Data home for this Type. Edit here to tune the type in isolation.
const meetingType: MeetingType = {
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
  // Eval rules injected into the shared eval prompt via {{TYPE_EVAL_RULES}}.
  // Was a 289-line forked final-evaluation.md; this is the only part that differed.
  eval_rules: [
    "<type_eval_rules>",
    "Growth & career plan — next-plan mandate:",
    "- `brutal_truth_manager` MUST name one specific next-plan move — a competency to demonstrate, a stakeholder to expose to, a project to assign, a scope-stretch to grant, or a decision to escalate.",
    '- FORBIDDEN generic verbs in `brutal_truth_manager`: `"delve"`, `"explore further"`, `"dig deeper"`, `"follow up"`, `"look into"`, `"investigate"`.',
    '- Required noun set in `brutal_truth_manager` (at least one): `"project"`, `"stakeholder"`, `"scope"`, `"decision"`, `"competency"`, `"ownership"`, `"authority"`.',
    "- `brutal_truth_manager` MUST quote (in double quotes) one specific phrase from the transcript OR name one specific artefact / behaviour / moment that constitutes evidence for or against the report's stated next-level claim. Bare opinion without evidence is not acceptable.",
    "</type_eval_rules>",
  ].join("\n"),
  // Prompt set: inherits the shared house prompts.
  prompts: { ...SHARED_PROMPTS },
};

export default meetingType;
