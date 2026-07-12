// Types for the plain-JS state store (state.js), so TypeScript stages can import
// `{ STAGES, store, setState }` with real contracts while state.js itself stays JS.
// Added for the admin TypeScript pilot (repo-tidy Phase 4). Converting state.js
// itself to .ts is the next step; this declaration is the bridge in the meantime.

export type StageName =
  | "WELCOME"
  | "LOGIN" | "REGISTER" | "JOIN" | "PRIVACY" | "ABOUT" | "FEEDBACK" | "START"
  | "MEMBER_HOME" | "TEAM" | "RUNS" | "RUN_DETAIL" | "GUIDED" | "PERSON_DETAIL"
  | "INTAKE" | "ONEPAGE" | "FOCUS_POINTS"
  | "PREPARATION" | "BANK" | "QUESTIONING" | "EVAL" | "BRIEFING"
  | "LEXICON_REVIEW" | "RUN_DEBRIEF" | "COMPARE" | "LIBRARY" | "ROLE_LEXICONS"
  | "MEETING_ARCS" | "PERSONAS" | "REVIEW_RUN" | "GUIDE"
  | "TASKS" | "UNIVERSE" | "ADMIN_REGISTERED" | "ADMIN_USER" | "ERROR";

export const STAGES: Readonly<Record<StageName, StageName>>;

export interface SessionCtx {
  personId: string | null; // people-roster Phase 4: the roster person this 1:1 is about (null = free-typed)
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
  myRunId: string | null;
  guidedId: string | null; // monthly-checkin: the guided session id the runner (/guided/:id) loads
  personKey: string | null;
  joinToken: string | null;
  adminUserId: string | null;
  adminUserName: string | null;
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
  // Not in state.js's initial object — patched in via setState (main.js rehydrate),
  // read by briefing.js — so optional here.
  skipBriefingAnimation?: boolean;
  // Stage the user was on when they opened the Privacy note, so its Back link
  // returns there (set in main.js's render loop, read by privacy.js).
  privacyBack?: StageName;
}

export const store: Store;
export function subscribe(fn: (store: Store) => void): () => void;
export function setState(patch: Partial<Store>): void;
export function isAdmin(user: unknown): boolean;
export function isInternalAdmin(user: unknown): boolean;
export function isSuperadmin(user: unknown): boolean;
export function resetSession(): void;
