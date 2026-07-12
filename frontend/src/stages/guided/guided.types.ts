// Types for the guided-session runner (Monthly Check-in and future guided arcs).
// A guided arc is DATA — an ordered list of stage ids — not code. The runner reads
// its stages from GUIDED_ARCS and never hardcodes the 7. See
// docs/plans/doing/monthly-one-on-one/architecture.md §2b (the extensibility seam).

export type GuidedStageId =
  | "catchup"
  | "requests"
  | "rating"
  | "feedback"
  | "goals"
  | "summary"
  | "wrapup";

/** The persisted `stage` column: a runner stage, or "done" once the session completes. */
export type GuidedStage = GuidedStageId | "done";

export interface GuidedArc {
  slug: string; // "monthly_check_in"
  label: string; // "Monthly Check-in" — the picker/UI label
  badge?: string; // "New"
  stages: GuidedStageId[]; // ordered — THIS is the arc
  aiWrapup: boolean; // does the end-of-session AI call fire? (Phase 5)
}

// The per-stage draft the manager types. Persisted whole under guided_sessions.state
// jsonb. Every field optional — reads are defensive so a session created under one arc
// still opens if the arc later changes (architecture.md §4).
export interface GuidedDraft {
  catchup?: { notes?: string; outcomes?: Record<string, string> };
  requests?: { notes?: string };
  rating?: {
    notes?: string;
    scores?: Record<string, number>;
    blockNotes?: Record<string, string>;
  };
  feedback?: { fbStep?: number; lessOf?: string; moreOf?: string; learn?: string };
  goals?: { notes?: string };
  summary?: {
    draft?: { headline: string; bullets: string[] }; // the AI draft (Phase 5)
    edited?: string; // the manager's text — always wins
    error?: string; // "couldn't draft this" — surfaced, never hidden
  };
  wrapup?: {
    engagement?: number | null;
    privateNotes?: string;
    suggestions?: { individual: string[]; team: string[]; company: string[] };
  };
}

/** The whole state blob. `v` guards shape drift; `arc` records which stage list to follow. */
export interface GuidedState extends GuidedDraft {
  v: number;
  arc: string; // arc slug
  step: number; // current stage index into the arc's stages
  visited: number[]; // stage indices the manager has landed on
}

/** What GET /api/v1/guided-sessions/:id returns to the runner. */
export interface GuidedSessionDto {
  id: string;
  personId: string;
  personName: string;
  stage: GuidedStage;
  state: GuidedState;
  engagement: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export const GUIDED_STATE_VERSION = 1;

// ── Trackers (Phase 2) — the shared promise/request/goal domain the runner reads live ──
export type TrackerKind = "promise" | "request" | "goal";

export interface TrackerEvent {
  at: string;
  type: string; // created | status | progress | note | outcome
  from?: string;
  to?: string;
  note?: string;
  by?: string;
}

export interface TrackerItem {
  id: string;
  personId: string;
  kind: TrackerKind;
  text: string;
  owner: string | null; // promise: "manager" | "member"
  category: string | null; // request category
  status: string;
  progress: number; // goal 0–100
  history: TrackerEvent[];
  createdSessionId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedTrackers {
  promises: TrackerItem[];
  requests: TrackerItem[];
  goals: TrackerItem[];
}

// ── Block scores (Phase 3) — six-block ratings, read for the last-time marker ──
export interface BlockScore {
  block: string;
  score: number;
  note: string | null;
  guidedSessionId: string;
  createdAt: string;
}
