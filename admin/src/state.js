// Minimal state store + machine transitions. No dependencies.

export const STAGES = Object.freeze({
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
  RUNS: "RUNS",
  RUN_DETAIL: "RUN_DETAIL",
  PERSON_DETAIL: "PERSON_DETAIL",
  INTAKE: "INTAKE",
  ONEPAGE: "ONEPAGE",
  FOCUS_POINTS: "FOCUS_POINTS",
  PREPARATION: "PREPARATION",
  BANK: "BANK",
  QUESTIONING: "QUESTIONING",
  EVAL: "EVAL",
  BRIEFING: "BRIEFING",
  LEXICON_REVIEW: "LEXICON_REVIEW",
  RUN_DEBRIEF: "RUN_DEBRIEF",
  COMPARE: "COMPARE",
  LIBRARY: "LIBRARY",
  ROLE_LEXICONS: "ROLE_LEXICONS",
  MEETING_ARCS: "MEETING_ARCS",
  PERSONAS: "PERSONAS",
  REVIEW_RUN: "REVIEW_RUN",
  GUIDE: "GUIDE",
  TASKS: "TASKS",
  UNIVERSE: "UNIVERSE",
  ADMIN_PULSE: "ADMIN_PULSE",
  ADMIN_REGISTERED: "ADMIN_REGISTERED",
  ADMIN_USER: "ADMIN_USER",
  ADMIN_ERROR_LOG: "ADMIN_ERROR_LOG",
  ADMIN_FEEDBACK: "ADMIN_FEEDBACK",
  ADMIN_GUEST_RUNS: "ADMIN_GUEST_RUNS",
  DESIGN: "DESIGN",
  TEST: "TEST",
  ERROR: "ERROR",
});

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
  personKey: null,
  joinToken: null,
  resetToken: null,
  adminUserId: null,
  adminUserName: null,
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
};

export const store = { ...initial };
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(store, patch);
  for (const fn of listeners) {
    try { fn(store); } catch (e) { console.error("[state] listener error", e); }
  }
}

// True when the logged-in user is a manager/admin — the internal tooling is theirs, a
// plain member only gets the prep flow (admin-access-guard Phase 2). Handles both shapes
// we store: me() gives { roles: [...] }, login() gives a PublicUser { role: "..." }.
// Mirrors the backend ADMIN_ROLES gate in require-auth.ts.
export function isAdmin(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  return roles.includes("manager") || roles.includes("admin");
}

// Manager-ready Phase 1: only the internal `admin` role sees the internal toolset rail
// (Library, Compare, Personas, lexicons, Universe, Tasks…). Managers keep console access
// (isAdmin above) but get their own customer rail: Home · New 1:1 · Team · Past 1:1s.
export function isInternalAdmin(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  return roles.includes("admin");
}

// The cross-company superadmin (pre-go-live PG6+). Server-resolved from the email
// allowlist and returned on the identity — never a role. Gates the /admin/* screens
// (F-009): the backend 403s their data, this keeps a non-superadmin off the shells too.
export function isSuperadmin(user) {
  return !!(user && user.isSuperadmin);
}

// True when the app is running as the LIVE site (appEnv from /auth/me, server truth —
// admin-live-deploy Phase 2). Drives the live nav trim (Test engine + Tasks hidden) and
// the deep-link bounce. Cosmetic on top of the Phase-1 backend fence.
export function isLiveEnv() {
  return store.appEnv === "live";
}

export function resetSession() {
  // Preserve the logged-in user across a session reset — "new session" clears the
  // run, not the login.
  const user = store.user;
  const appEnv = store.appEnv; // environment truth survives a session reset
  Object.assign(store, { ...initial, user, appEnv, ctx: { personId: null, name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" } });
  try { localStorage.removeItem("seroSessionId"); } catch {}
}
