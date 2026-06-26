// The shape of a 1:1 Type's data file (one-on-one-types/<slug>/type.ts). The
// registry (index.ts) aggregates these; arc-overlay merges a manager's saved
// edits over the editable fields (arc, tone_register, anti_patterns) at read time.

export interface ArcPhase {
  id: string;
  label: string;
  intent: string;
  target_questions: number;
}

export interface MeetingType {
  slug: string;
  label: string;
  tone_register: string;
  arc: ArcPhase[];
  anti_patterns: string[];
  // Machine-checkable forbidden phrasings, enforced by question-eligibility. Type-specific.
  forbidden_question_res?: RegExp[];
  // Type-specific eval rules injected into the shared eval prompt via {{TYPE_EVAL_RULES}}.
  eval_rules?: string;
  // Stage-slot -> prompt-file path. Inherits SHARED_PROMPTS; a Type overrides a slot to fork.
  prompts: Record<string, string>;
}
