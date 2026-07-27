// Minimal state store + machine transitions. No dependencies.
//
// Was state.js + a hand-written state.d.ts bridge; converted to real TypeScript
// (refactor-2026-07 P5) after the bridge drifted twice — the types now live with
// the code and can't disagree with it.

const STAGES_OBJ = {
  WELCOME: "WELCOME",
  LOGIN: "LOGIN",
  REGISTER: "REGISTER",
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
  RESET_PASSWORD: "RESET_PASSWORD",
  JOIN: "JOIN",
  PRIVACY: "PRIVACY",
  ABOUT: "ABOUT",
  FEEDBACK: "FEEDBACK",
  START: "START",
  MEMBER_HOME: "MEMBER_HOME",
  TEAM: "TEAM",
  MEMBERS: "MEMBERS",
  RUNS: "RUNS",
  RUN_DETAIL: "RUN_DETAIL",
  GUIDED: "GUIDED",
  PERSON_DETAIL: "PERSON_DETAIL",
  INTAKE: "INTAKE",
  FOCUS_POINTS: "FOCUS_POINTS",
  PREPARATION: "PREPARATION",
  BANK: "BANK",
  QUESTIONING: "QUESTIONING",
  EVAL: "EVAL",
  BRIEFING: "BRIEFING",
  STAGE_LOOKBACK: "STAGE_LOOKBACK",
  LEXICON_REVIEW: "LEXICON_REVIEW",
  RUN_DEBRIEF: "RUN_DEBRIEF",
  COMPARE: "COMPARE",
  LIBRARY: "LIBRARY",
  ROLE_LEXICONS: "ROLE_LEXICONS",
  MEETING_ARCS: "MEETING_ARCS",
  PERSONAS: "PERSONAS",
  REVIEW_RUN: "REVIEW_RUN",
  GUIDE: "GUIDE",
  ADMIN_PULSE: "ADMIN_PULSE",
  ADMIN_GATE1: "ADMIN_GATE1",
  ADMIN_RUNS: "ADMIN_RUNS",
  ADMIN_RATINGS: "ADMIN_RATINGS",
  ADMIN_REGISTERED: "ADMIN_REGISTERED",
  ADMIN_USER: "ADMIN_USER",
  ADMIN_ERROR_LOG: "ADMIN_ERROR_LOG",
  ADMIN_FEEDBACK: "ADMIN_FEEDBACK",
  ADMIN_GUEST_RUNS: "ADMIN_GUEST_RUNS",
  DESIGN: "DESIGN",
  TEST: "TEST",
  GALLERY: "GALLERY",
  ERROR: "ERROR",
} as const;

// Key = value by construction, so the union derives from the one object and a
// new stage can never be missing from the type (the old d.ts bridge's failure).
export type StageName = keyof typeof STAGES_OBJ;

export const STAGES: Readonly<Record<StageName, StageName>> = Object.freeze(STAGES_OBJ);

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
  // Stage look-back (stage-back-nav P1): which finished stage the user clicked in
  // the run breadcrumb, and the live stage to send them back to. Both null unless
  // stage === STAGE_LOOKBACK. The run's own `stage` is never moved backwards.
  lookbackStage: StageName | null;
  lookbackReturn: StageName | null;
  // Promises-before-recap (in `initial`, so resetSession clears them).
  promises: unknown;
  promisesConfirmed: boolean;
  promisesConfirmSkip: boolean;
  promisesSaveFailed: boolean;
  // Per-app homes — not in `initial`; injected ONCE by each app's main.js at import time
  // (admin: RUNS/LOGIN, customer: MEMBER_HOME/WELCOME), read by the shared exit/landing
  // helpers. Typed required because boot always runs before any stage mounts.
  memberHome: StageName;
  guestHome: StageName;
  // Not in `initial` — patched in via setState (main.js rehydrate), read by
  // briefing.js — so optional here.
  skipBriefingAnimation?: boolean;
  // Stage the user was on when they opened the Privacy note, so its Back link
  // returns there (set in main.js's render loop, read by privacy.js).
  privacyBack?: StageName;
}

const initial = {
  user: null,
  appEnv: null, // "live" | "local" — server truth from /auth/me (admin-live-deploy). null until boot.
  sessionId: null,
  stage: STAGES.START,
  substage: "NAME",
  turn: 0,
  totalBudget: 9,
  ctx: { personId: null, name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" },
  focusPoints: null,
  preparation: null,
  preparationRunId: null,
  reviewRunId: null,
  myRunId: null,
  guidedId: null,
  personKey: null,
  joinToken: null,
  resetToken: null,
  adminUserId: null,
  adminUserName: null,
  galleryScreen: null, // Screen Gallery: which screen the /gallery host is showing (stage key or null)
  currentQuestion: null,
  axes: [],
  briefing: null,
  notes: [],
  sessionDir: null,
  createdAt: null,
  completedAt: null,
  error: null,
  retryStage: null,
  stageTick: 0,
  regenerateFocusPoints: false,
  scripted: null,
  // Look-back position. In `initial` so resetSession clears it: a stale
  // lookbackStage would otherwise send the next run in this tab straight into a
  // look-back screen for a session that no longer exists.
  lookbackStage: null,
  lookbackReturn: null,
  // Promises-before-recap. These MUST live in `initial`: resetSession() only
  // resets keys listed here, so a flag set ad-hoc on the store would leak into
  // the next run in the same tab (the old confirm card had exactly that bug).
  promises: null,
  promisesConfirmed: false,
  promisesConfirmSkip: false,
  promisesSaveFailed: false,
} satisfies Omit<Store, "memberHome" | "guestHome">;

// The per-app homes are injected by each app's main.js the moment this module
// loads, before any stage can mount — so the cast is a boot-order fact, not a
// lie. (They deliberately stay OUT of `initial`: resetSession spreads `initial`,
// and re-defaulting memberHome there would clobber the customer app's home.)
export const store = { ...initial } as unknown as Store;
const listeners = new Set<(s: Store) => void>();

export function subscribe(fn: (s: Store) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch: Partial<Store>): void {
  Object.assign(store, patch);
  for (const fn of listeners) {
    try { fn(store); } catch (e) { console.error("[state] listener error", e); }
  }
}

// True when the logged-in user is a manager/admin — the internal tooling is theirs, a
// plain member only gets the prep flow (admin-access-guard Phase 2). Handles both shapes
// we store: me() gives { roles: [...] }, login() gives a PublicUser { role: "..." }.
// Mirrors the backend ADMIN_ROLES gate in require-auth.ts.
export function isAdmin(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const u = user as { roles?: unknown; role?: unknown };
  const roles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
  return roles.includes("manager") || roles.includes("admin");
}

// Manager-ready Phase 1: only the internal `admin` role sees the internal toolset rail
// (Library, Compare, Personas, lexicons, Universe…). Managers keep console access
// (isAdmin above) but get their own customer rail: Home · New 1:1 · Team · Past 1:1s.
// A superadmin-by-email is internal too — otherwise a superadmin whose stored role is
// `manager` would be walled out of their own internal tools (mirrors the server-side
// isInternalIdentity in require-auth.ts; monthly-checkin architecture.md §3.1).
export function isInternalAdmin(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const u = user as { roles?: unknown; role?: unknown };
  const roles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
  return roles.includes("admin") || isSuperadmin(user);
}

// The cross-company superadmin (pre-go-live PG6+). Server-resolved from the email
// allowlist and returned on the identity — never a role. Gates the /admin/* screens
// (F-009): the backend 403s their data, this keeps a non-superadmin off the shells too.
export function isSuperadmin(user: unknown): boolean {
  return !!(user && typeof user === "object" && (user as { isSuperadmin?: unknown }).isSuperadmin);
}

// True when the app is running as the LIVE site (appEnv from /auth/me, server truth —
// admin-live-deploy Phase 2). Drives the live nav trim (Test engine hidden) and
// the deep-link bounce. Cosmetic on top of the Phase-1 backend fence.
export function isLiveEnv(): boolean {
  return store.appEnv === "live";
}

export function resetSession(): void {
  // Preserve the logged-in user across a session reset — "new session" clears the
  // run, not the login.
  const user = store.user;
  const appEnv = store.appEnv; // environment truth survives a session reset
  Object.assign(store, { ...initial, user, appEnv, ctx: { personId: null, name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" } });
  try { localStorage.removeItem("seroSessionId"); } catch { /* storage blocked — nothing to clear */ }
}
