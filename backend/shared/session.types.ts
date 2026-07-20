// The per-run pipeline state (the live in-memory object). Built in backend/api/sessions.ts
// (createWebSession); serialized to disk by backend/api/session-persistence.ts.
// NOTE: backend/engine/session.ts is a DIFFERENT, tiny logging helper ({ id, dir }) — not this.
// Fields marked "runtime-only" are rebuilt on hydrate and are NEVER serialized.

import type { Question } from "./question.types.ts";
import type { Briefing } from "./briefing.types.ts";
import type { CostTracker } from "./cost.types.ts";

/** Meeting context captured at intake (built in services/sessions/sessions.service.ts). */
export interface MeetingContext {
  name: string;
  role: string;
  seniority: string;
  meetingType: string; // the type *label*, not an index
  notes: string; // "" when absent — always a string
}

/** One slot in the live axisState map (engine/axes.js). */
export interface AxisSlot {
  id: string;
  label: string;
  score: number; // clamped -10..+10
  lastDelta: number;
  history: Array<{ q: string; delta: number; answer_excerpt: string }>;
}
export type AxisState = Record<string, AxisSlot>;

/** A captured in-meeting note (handlers/notes.js). */
export interface SessionNote {
  id: string;
  stage: string; // a STAGE_LABEL key ("QUESTIONING", "EVAL", …) or "" — stored loosely
  turn: number; // 0 when not turn-bound
  ts: number; // epoch ms
  text: string; // capped at 4000 chars
  question_alias: string; // capped at 120 chars
  question_stem: string; // capped at 80 chars
}

/** Run fingerprint stamped on each run for Compare (engine/run-fingerprint.js). */
export interface RunFingerprint {
  mode: "manual" | "scripted";
  runLabel: string | null;
  personaId: string | null;
  scriptVersion: string | null;
  promptVersion: string; // content hash, or "unknown"
  modelConfigVersion: string; // content hash, or "unknown"
}

/** Structured tester verdict (handlers/verdict.js) — QA-tooling ground truth. */
export interface TesterVerdict {
  verdict: "keep" | "fix" | "block";
  issue_type:
    | "too_generic"
    | "wrong_level"
    | "bad_tone"
    | "over_inferred"
    | "missed_focus"
    | "weak_action"
    | null;
  note: string | null;
  at: number; // epoch ms
}

export interface FocusPoint {
  id: string;
  type: string | null; // catalogue label; null if the id is unknown
  category: string | null; // null if the id is unknown
  label: string;
  reason: string;
  source: "signal" | "best_practice";
  confidence: "low" | "medium" | "high";
  known: boolean; // whether the id matched the catalogue
}
export interface FocusPointsResult {
  meeting_type: string;
  focus_points: FocusPoint[];
}

export interface PreparationResult {
  brief: {
    coreIssue: string;
    openingQuestion: string;
    listenFor: string[];
    avoid: string[];
    goodOutcome: string;
    suggestedAction: string;
    confidence: string; // free text starting Low/Medium/High
    dontAssume: string;
  };
  runId: string;
  validation: { passed: boolean; issues: string[] };
  attempts: number; // 1 or 2
}

/** One answered turn (handlers/plan.js; the CLI builds the same in cli/stages/questioning.js). */
export interface TranscriptEntry {
  turn: number;
  question: Question;
  answer: string; // "(skipped)" when skipped
  skipped: boolean;
  realized_deltas?: Record<string, number>; // added after planning
  note?: string; // planner note; may carry [SHALLOW]/[SKIP] markers
  unbooked_signal?: Array<{ axis: string; raw: number; booked: number; reason: string }>; // planner-held signal: clampToSignature overflow (off_signature/empty_signature/clamped) + shallow-gate zeroing (shallow_zeroed/shallow_zeroed_protect_eligible, better-reads P1)
}

/** Back-nav snapshot (handlers/plan.js). */
export interface TurnSnapshot {
  appliedTurn: number;
  turn: number;
  totalBudget: number;
  queueRef: Question[];
  axisState: AxisState;
  transcript: TranscriptEntry[];
  agendaInjected: boolean;
  agendaInput: { raw: string; summary: string } | null;
  question: Question | null;
  answerText: string;
}

/** One agreed next action from a 1:1's wrap-up — the Promises loop's unit
 *  (docs/plans/doing/promises-loop/plan.md). MANAGER-CONFIRMED ONLY: the engine
 *  suggests (briefing next_actions), the manager confirms at the wrap-up card —
 *  only confirmed promises are stored (no-inference ruling). `outcome` stays null
 *  until the NEXT session's check-in taps it (phase 2 writes it back here). */
export interface SessionPromise {
  id: string;
  owner: "manager" | "report"; // whose commitment it is — manager's own list first in every UI
  action: string;
  when: string; // the briefing's when-bucket ("today" | "this week" | …) — kept as text
  outcome: "yes" | "partly" | "no" | "changed" | null;
  at: number; // when the manager confirmed it
}

/** The card-zero check-in result stored on the CURRENT session (Promises loop
 *  phase 2) — a copy of what the manager tapped about the PRIOR run's promises,
 *  so phase 3's engine feed reads its own session (no second history query).
 *  skipped=true means the manager waved it off: nothing was written back and
 *  the prior promises stay open. */
export interface PriorCheckin {
  fromSessionId: string; // the prior run the taps were written onto ("" on a skip with no prior)
  skipped: boolean;
  outcomes: Array<{
    id: string;
    owner: "manager" | "report";
    action: string;
    outcome: "yes" | "partly" | "no" | "changed";
  }>;
  at: number;
}

export interface Session {
  id: string;
  dir: string;
  orgId?: string | null; // the company that owns this run; null = unfenced (legacy/anonymous). Phase 007/2.
  userId?: string | null; // the member who created this run; null = unattributed (legacy/anonymous). member-nav Phase 2.
  personId?: string | null; // the roster person this 1:1 is ABOUT (people table row); null = unlinked (guest/file-only/legacy). people-roster Phase 2.
  createdAt: number;
  lastSeenAt: number;
  completedAt: number | null;
  ctx: MeetingContext;
  introQueue: Question[];
  focusPointsResult: FocusPointsResult | null;
  preparationResult: PreparationResult | null;
  selectedFocusPoints?: string[];
  bankReady: false | { count: number };
  briefing: Briefing | null;
  queueRef: Question[];
  axisState: AxisState;
  transcript: TranscriptEntry[];
  turn: number;
  totalBudget: number;
  closer: Question | null;
  prepOpener: Question | null;
  notes: SessionNote[];
  agendaInput: { raw: string; summary: string } | null;
  agendaInjected: boolean;
  agendaCovered: boolean | null;
  // One-tap post-meeting capture on the PRIOR session's agreed action — the
  // deterministic loop-closure event the no-inference ruling replaces state
  // inference with (docs/reference/prompt-improvement-spec.md §6). Its consumer is
  // the Promises loop: phase 2 writes it as the roll-up of promises[] outcomes.
  outcomeCheck?: "yes" | "partly" | "no" | "changed" | null;
  // The wrap-up's manager-confirmed agreements (Promises loop phase 1). null/absent =
  // the manager skipped confirming (loop not armed for this run).
  promises?: SessionPromise[] | null;
  // Card zero's result on THIS session (Promises loop phase 2) — see PriorCheckin.
  priorCheckin?: PriorCheckin | null;
  turnSnapshots: TurnSnapshot[];
  pendingAnswer: { raw: string; skipped: boolean; text: string } | null;

  // lifecycle / scripted lane (set at session creation or at specific stages)
  sessionBank?: Question[] | null;
  mode?: "manual" | "scripted";
  runLabel?: string | null;
  fingerprint?: RunFingerprint | null;
  scriptAnswers?: Record<string, string> | null;
  scriptedFallback?: string | null;
  scriptCoverage?: {
    aliases_answered_by_script: string[];
    aliases_missing_script: string[];
    fallback_count: number;
  } | null;
  verdict?: TesterVerdict | null;

  // runtime-only — rebuilt on hydrate, NEVER serialized:
  lastPlanByTurn: Map<number, unknown>; // per-turn idempotency cache (internal plan memo)
  inFlight: Map<string, unknown>; // in-flight request de-dup (internal)
  tracker: CostTracker;
}
