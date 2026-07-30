// The runtime question object. Canonical mint: backend/engine/question-generator.ts;
// also minted by the YAML loader (questions.ts) and the hardcoded intro/agenda constructors.

/**
 * Why a question exists. Wider than the LLM bank enum — the hardcoded intro/agenda
 * questions use "engagement" (the intro/agenda constructors in backend/api/sessions.ts), which the bank schema never emits.
 */
export type QuestionPurpose = "wellbeing" | "topic" | "competency" | "engagement" | "scripted" | "clarity";

/**
 * One manager-only coaching hint on a question (coach-panel Phase 2). `kind`:
 * "ask" = how to deliver the question, "listen" = what to hear in the answer —
 * the "How to ask" / "Listen for" pills in the coach panel's Support view.
 * Written at question-generation time; never shown to the person being managed.
 */
export interface QuestionHint {
  kind: "ask" | "listen";
  text: string;
}

export interface Question {
  alias: string; // stable id, e.g. "q_intro_agenda_check"
  label: string; // short human label
  name: string; // the question text shown to the manager
  description: string; // purpose / explanation
  purpose: QuestionPurpose;
  stage: string | null; // arc stage id; null when not stage-bound
  axis_effects: Record<string, number>; // map axisId→delta at runtime (an array on the LLM wire; toAxisObject converts it)
  source: string; // provenance: "generated" | "seed" | "semi_set" | "agenda_carry_forward" | opener sources (open string)
  hints?: QuestionHint[]; // manager-only coaching (coach-panel Phase 2)
  // Where those hints came from, when it isn't this question. "inherited" means
  // they were written for the question this one follows up on — a thread-follow
  // is minted in code with no model call, so it can never have its own. The panel
  // labels them, rather than passing them off as written for this question
  // (question-support-hints Phase 3). Absent = the hints are this question's own.
  hints_source?: "inherited";
  // True when this question drills the thread the last answer opened, set at
  // runtime by markThreadFollow (backend/engine/thread-follow.ts). The question
  // screen shows its "following up on what you just said" cue off this: a
  // model-written drill carries no q_thread_follow alias to match on.
  follows_thread?: boolean;
  // NOTE (decision for review): the YAML loader (questions.ts) surfaces any extra top-level
  // scalar key, so YAML questions *can* carry more than these fields. We keep the contract
  // CLOSED — a new field (like `hints`) is added explicitly here, which documents it, rather
  // than weakening this to an index signature.
}

/**
 * The subset actually sent to the browser (shaped by the session streams layer).
 * `hints` is manager-only coaching — the whole app runs behind manager/admin auth,
 * so it is safe on this wire; it must never reach a member-facing payload.
 */
export type WireQuestion = Pick<
  Question,
  "alias" | "label" | "name" | "description" | "purpose" | "hints" | "hints_source" | "follows_thread"
>;
