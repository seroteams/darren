// Types for the plain-JS state store (state.js), so TypeScript stages can import
// `{ STAGES, store, setState }` with real contracts while state.js itself stays JS.
// Added for the admin TypeScript pilot (repo-tidy Phase 4); resynced with state.js
// when the test typecheck landed (refactor-2026-07 P2 — it had drifted: MEMBERS/TEST/
// GALLERY, the promises keys and the per-app homes were missing). Converting state.js
// itself to .ts and deleting this bridge is refactor-2026-07 P5.

export type StageName =
  | "WELCOME"
  | "LOGIN" | "REGISTER" | "FORGOT_PASSWORD" | "RESET_PASSWORD" | "JOIN" | "PRIVACY" | "ABOUT" | "FEEDBACK" | "START"
  | "MEMBER_HOME" | "TEAM" | "MEMBERS" | "RUNS" | "RUN_DETAIL" | "GUIDED" | "PERSON_DETAIL"
  | "INTAKE" | "FOCUS_POINTS"
  | "PREPARATION" | "BANK" | "QUESTIONING" | "EVAL" | "BRIEFING"
  | "LEXICON_REVIEW" | "RUN_DEBRIEF" | "COMPARE" | "LIBRARY" | "ROLE_LEXICONS"
  | "MEETING_ARCS" | "PERSONAS" | "REVIEW_RUN" | "GUIDE" | "DESIGN" | "TEST" | "GALLERY"
  | "ADMIN_PULSE" | "ADMIN_GATE1" | "ADMIN_RUNS" | "ADMIN_RATINGS"
  | "ADMIN_REGISTERED" | "ADMIN_USER" | "ADMIN_ERROR_LOG" | "ADMIN_FEEDBACK" | "ADMIN_GUEST_RUNS"
  | "ERROR";

export const STAGES: Readonly<Record<StageName, StageName>>;

// The logged-in identity as stored: /auth/me gives { roles: [...] }, login/register give
// a PublicUser { role: "..." } — isAdmin/isInternalAdmin handle both shapes. Superadmin
// and company ride on some responses only, so everything is optional.
export interface StoreUser {
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  company?: string;
  isSuperadmin?: boolean;
}

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
  user: StoreUser | null;
  appEnv: "live" | "local" | null;
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
  resetToken: string | null;
  adminUserId: string | null;
  adminUserName: string | null;
  galleryScreen: string | null; // Screen Gallery: which screen the /gallery host is showing (stage key or null)
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
  // Promises-before-recap (in state.js's `initial`, so resetSession clears them).
  promises: unknown;
  promisesConfirmed: boolean;
  promisesConfirmSkip: boolean;
  promisesSaveFailed: boolean;
  // Per-app homes — not in `initial`; injected ONCE by each app's main.js at import time
  // (admin: RUNS/LOGIN, customer: MEMBER_HOME/WELCOME), read by the shared exit/landing
  // helpers. Typed required because boot always runs before any stage mounts.
  memberHome: StageName;
  guestHome: StageName;
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
export function isLiveEnv(): boolean;
export function resetSession(): void;
