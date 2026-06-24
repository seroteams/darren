// The final prep briefing. Produced by evaluate() in backend/engine/reviewer.js,
// then wrapped with `cost` + `completedAt` in backend/api/handlers/evaluation.js.

import type { CostSummary } from "./cost.types.ts";

export interface AxisRead {
  id: string;
  score: number; // overwritten from live axis state, clamped -10..+10
  meaning: string;
  read_status: "read" | "not_read";
  not_read_reason?: "no_history" | "zero_score" | "insufficient_signal"; // only when not_read
  confidence?: "low" | "medium" | "high"; // absent on the fallback path
  evidence_basis?: "mixed" | "axis_state_only" | "transcript_quotes" | "concentrated_signal"; // absent on fallback
}

export interface EngagementRead {
  level: "inconclusive" | "no_clear_concern" | "worth_checking" | "clear_concern";
  evidence: string[];
  missing_evidence: string;
  recommended_action: string;
  watch_next: string;
}

export interface NextAction {
  when: "today" | "this week" | "this month" | "next 1:1";
  action: string;
}

export interface Briefing {
  headline: string;
  summary_bullets: string[];
  understanding_paragraph: string;
  axes: AxisRead[];
  brutal_truth_employee: string; // "" in the fallback briefing
  brutal_truth_manager: string; // "" in the fallback briefing
  next_actions: NextAction[];
  watch_for: string[];
  engagement_read: EngagementRead;
  // added by the API wrapper (evaluation.js):
  cost?: CostSummary;
  completedAt?: number;
  // fallback-only discriminant — present ONLY when generation failed (buildFallbackBriefing):
  generation_failed?: true;
}
