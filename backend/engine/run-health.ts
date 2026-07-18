// H3 — degradation alarm.
//
// The engine degrades quietly in two ways: a per-turn planner throw (falls back
// to empty deltas + a "(planner failed)" note) and an evaluation failure (falls
// back to a minimal briefing flagged GENERATION_FAILED). Today the only trace of
// either is a console.warn — so if a prompt edit starts degrading a whole class
// of inputs, the failure *rate* is invisible.
//
// This writes a small health.json into every run's root (via logRunRoot, the
// existing dual-write path — DB + disk echo). Healthy runs record degraded:false
// too, so the rate is computable: count degraded runs over a window of runs.

// The exact note the per-turn planner writes when it throws. Shared so the lanes
// that SET it and the counter that READS it can never drift apart.
export const PLANNER_FAILED_NOTE = "(planner failed)";

export interface RunHealth {
  // The final briefing fell back to the deterministic minimal one (GENERATION_FAILED).
  evaluation_degraded: boolean;
  // Turns whose planner threw and shipped empty deltas.
  planner_failed_turns: number;
  total_turns: number;
  // H4 — a serve-time leak was detected, so a safe fallback shipped instead of
  // the model's briefing. Distinct from evaluation_degraded (which is a model
  // failure); this is a deliberate block.
  leak_blocked: boolean;
  leak_reasons: string[];
  // Any degradation at all — the single field a monitor can alarm on.
  degraded: boolean;
}

// Scoring health for the reviewer, rebuilt from the finished transcript. The CLI
// counts {failures, scoredTurns} inline as it runs; the live orchestrator has no
// such running tally, so it reconstructs the same two numbers here — both then feed
// the reviewer's low-confidence guard identically (formatScoringStatus). A skipped
// turn was never scored, so it counts toward neither number (mirrors the CLI, which
// only tallies non-skipped turns).
export function scoringFromTranscript(
  transcript: ReadonlyArray<{ note?: string | null; skipped?: boolean }> | null | undefined,
): { failures: number; scoredTurns: number } {
  const turns = Array.isArray(transcript) ? transcript : [];
  const scored = turns.filter((t) => !t?.skipped);
  return {
    failures: scored.filter((t) => t?.note === PLANNER_FAILED_NOTE).length,
    scoredTurns: scored.length,
  };
}

// Pure summary of one run's health from its transcript, whether evaluation fell
// back, and any serve-time leak reasons that forced a block. Reads only `note`,
// so any turn-shaped object works.
export function buildRunHealth(
  transcript: ReadonlyArray<{ note?: string | null }> | null | undefined,
  evaluationDegraded: boolean,
  leakReasons: ReadonlyArray<string> = [],
): RunHealth {
  const turns = Array.isArray(transcript) ? transcript : [];
  const plannerFailedTurns = turns.filter((t) => t?.note === PLANNER_FAILED_NOTE).length;
  const leaks = Array.isArray(leakReasons) ? [...leakReasons] : [];
  return {
    evaluation_degraded: evaluationDegraded,
    planner_failed_turns: plannerFailedTurns,
    total_turns: turns.length,
    leak_blocked: leaks.length > 0,
    leak_reasons: leaks,
    degraded: evaluationDegraded || plannerFailedTurns > 0 || leaks.length > 0,
  };
}
