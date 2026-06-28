// Transcript + arc metrics for plan-turn: arc progress, drill/clarifier counts,
// last-realized deltas. Extracted verbatim from queue-manager.ts (Phase 2 repo-tidy).
import type { Arc } from "./queue-constants.ts";
import type { TranscriptEntry } from "../shared/session.types.ts";

function computeArcProgress(transcript: TranscriptEntry[] | null | undefined, arc: Arc): Record<string, number> {
  const progress: Record<string, number> = {};
  for (const stage of arc.arc) progress[stage.id] = 0;
  for (const t of transcript || []) {
    const s = t?.question?.stage;
    // hasOwnProperty guarantees the key exists (initialised to 0 above), but TS
    // can't see that through the runtime check — `?? 0` restores the value
    // without changing behaviour (the key is always a number here).
    if (s && Object.prototype.hasOwnProperty.call(progress, s)) progress[s] = (progress[s] ?? 0) + 1;
  }
  return progress;
}

function isPlannerOriginated(source: unknown): boolean {
  return source === "planner_added" || (typeof source === "string" && source.startsWith("reworded_from:"));
}

function isSameStagePlannerDrill(question: { stage?: string | null; source?: string } | null | undefined, stage: string | null | undefined): boolean {
  if (!question || stage == null || stage === undefined) return false;
  return question.stage === stage && isPlannerOriginated(question.source);
}

function computeConsecutiveDrillCount(transcript: TranscriptEntry[] | null | undefined, lastQuestion: { stage?: string | null } | null | undefined): number {
  if (!lastQuestion?.stage) return 0;
  let count = 0;
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i]?.question;
    if (!q) break;
    if (isSameStagePlannerDrill(q, lastQuestion.stage)) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

// D1 — stages whose arc_progress < target_questions, in arc order.
function computeRemainingStages(transcript: TranscriptEntry[] | null | undefined, arc: Arc): Array<{ id: string; label: string; intent: string; target_questions: number; arc_progress: number }> {
  const progress = computeArcProgress(transcript, arc);
  return arc.arc
    .map((stage) => ({
      id: stage.id,
      label: stage.label,
      intent: stage.intent,
      target_questions: stage.target_questions,
      arc_progress: progress[stage.id] || 0,
    }))
    .filter((s) => s.arc_progress < s.target_questions);
}

// D3 — most recent prior turn's realized deltas (used for snap-back).
function computeLastRealizedDeltas(transcript: TranscriptEntry[] | null | undefined): Record<string, number> {
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const d = t[i]?.realized_deltas;
    if (d && Object.keys(d).length > 0) return d;
  }
  return {};
}

// D4 — consecutive trailing planner_added items with purpose=wellbeing.
function computeConsecutiveWellbeingClarifierCount(transcript: TranscriptEntry[] | null | undefined): number {
  let count = 0;
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i]?.question;
    if (!q) break;
    if (q.source === "planner_added" && q.purpose === "wellbeing") count += 1;
    else break;
  }
  return count;
}

// D5 — session-wide count of planner_added items with stage=null
// (thread-follows that left the arc rather than staying inside it).
function computeOffArcDrillCount(transcript: TranscriptEntry[] | null | undefined): number {
  let count = 0;
  for (const t of transcript || []) {
    const q = t?.question;
    if (q?.source === "planner_added" && (q.stage === null || q.stage === undefined)) {
      count += 1;
    }
  }
  return count;
}

export {
  computeArcProgress,
  isPlannerOriginated,
  isSameStagePlannerDrill,
  computeConsecutiveDrillCount,
  computeRemainingStages,
  computeLastRealizedDeltas,
  computeConsecutiveWellbeingClarifierCount,
  computeOffArcDrillCount,
};
