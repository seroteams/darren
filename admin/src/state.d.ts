// Types for the plain-JS state store (state.js), so TypeScript stages can import
// `{ STAGES, store, setState }` with real contracts while state.js itself stays JS.
// Added for the admin TypeScript pilot (repo-tidy Phase 4). Converting state.js
// itself to .ts is the next step; this declaration is the bridge in the meantime.

export type StageName =
  | "LOGIN" | "REGISTER" | "PRIVACY" | "ABOUT" | "FEEDBACK" | "START"
  | "MEMBER_HOME" | "TEAM" | "RUNS" | "INTAKE" | "ONEPAGE" | "FOCUS_POINTS"
  | "PREPARATION" | "BANK" | "QUESTIONING" | "EVAL" | "BRIEFING"
  | "LEXICON_REVIEW" | "RUN_DEBRIEF" | "COMPARE" | "LIBRARY" | "ROLE_LEXICONS"
  | "MEETING_ARCS" | "REGRESSION" | "PERSONAS" | "REVIEW_RUN" | "GUIDE"
  | "TASKS" | "ERROR";

export const STAGES: Readonly<Record<StageName, StageName>>;

export interface SessionCtx {
  name: string;
  role: string;
  seniority: string;
  meetingType: string;
  meetingTypeIndex: number | null;
  notes: string;
}

export interface Store {
  user: unknown;
  sessionId: string | null;
  stage: StageName;
  substage: string;
  turn: number;
  totalBudget: number;
  ctx: SessionCtx;
  focusPoints: unknown;
  preparation: unknown;
  preparationRunId: string | null;
  reviewRunId: string | null;
  currentQuestion: unknown;
  axes: unknown[];
  briefing: unknown;
  notes: unknown[];
  sessionDir: string | null;
  createdAt: number | null;
  completedAt: number | null;
  error: string | null;
  retryStage: StageName | null;
  stageTick: number;
  regenerateFocusPoints: boolean;
  scripted: unknown;
}

export const store: Store;
export function subscribe(fn: (store: Store) => void): () => void;
export function setState(patch: Partial<Store>): void;
export function isAdmin(user: unknown): boolean;
export function resetSession(): void;
