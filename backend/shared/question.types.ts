// The runtime question object. Canonical mint: backend/engine/question-generator.js;
// also minted by the YAML loader (questions.js) and the hardcoded intro/agenda constructors.

/**
 * Why a question exists. Wider than the LLM bank enum — the hardcoded intro/agenda
 * questions use "engagement" (start.js, agenda.js), which the bank schema never emits.
 */
export type QuestionPurpose = "wellbeing" | "topic" | "competency" | "engagement" | "scripted";

export interface Question {
  alias: string; // stable id, e.g. "q_intro_agenda_check"
  label: string; // short human label
  name: string; // the question text shown to the manager
  description: string; // purpose / explanation
  purpose: QuestionPurpose;
  stage: string | null; // arc stage id; null when not stage-bound
  axis_effects: Record<string, number>; // map axisId→delta at runtime (an array on the LLM wire; toAxisObject converts it)
  source: string; // provenance: "generated" | "seed" | "semi_set" | "agenda_carry_forward" | opener sources (open string)
  // NOTE (decision for review): the YAML loader (questions.js) surfaces any extra top-level
  // scalar key, so YAML questions *can* carry more than these 8. We keep the contract CLOSED —
  // if a real consumer needs an extra field, we add it explicitly (which documents it) rather
  // than weakening this to an index signature.
}

/** The subset actually sent to the browser (handlers/question.js). */
export type WireQuestion = Pick<Question, "alias" | "label" | "name" | "description" | "purpose">;
