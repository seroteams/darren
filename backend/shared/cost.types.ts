// Cost-tracking contracts. Source of truth: backend/engine/cost.js (converted later).
// Lives in shared/ because it's referenced by both Session (the live tracker) and
// Briefing (the persisted cost summary) — one home, not duplicated.

/** OpenAI chat.completions usage block (only the fields cost.js reads). */
export interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

/** One recorded API call (cost.js `createTracker().record`). */
export interface CostCall {
  stage: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  usd_cost: number | null;
  known_price: boolean;
  price_note: string | undefined; // the "no pricing for X" reason; set only when price is unknown
  at: string; // ISO timestamp
  ms: number; // wall-clock duration of the call; 0 for replayed (cassette) calls — no network happened
}

/** `tracker.summary()` — surfaced on the briefing as `cost`. */
export interface CostSummary {
  call_count: number;
  usd_total: number;
  unknown_price_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  total_ms: number; // sum of per-call durations
  calls: CostCall[];
}

/** The live per-run cost tracker (runtime-only; never serialized). */
export interface CostTracker {
  record(stage: string, model: string, usage?: OpenAiUsage, ms?: number): void;
  summary(): CostSummary;
}
