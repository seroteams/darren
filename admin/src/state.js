// Minimal state store + machine transitions. No dependencies.

export const STAGES = Object.freeze({
  LOGIN: "LOGIN",
  REGISTER: "REGISTER",
  PRIVACY: "PRIVACY",
  ABOUT: "ABOUT",
  FEEDBACK: "FEEDBACK",
  START: "START",
  MEMBER_HOME: "MEMBER_HOME",
  TEAM: "TEAM",
  RUNS: "RUNS",
  RUN_DETAIL: "RUN_DETAIL",
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
  REGRESSION: "REGRESSION",
  PERSONAS: "PERSONAS",
  REVIEW_RUN: "REVIEW_RUN",
  GUIDE: "GUIDE",
  TASKS: "TASKS",
  ERROR: "ERROR",
});

const initial = {
  user: null,
  sessionId: null,
  stage: STAGES.START,
  substage: "NAME",
  turn: 0,
  totalBudget: 9,
  ctx: { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" },
  focusPoints: null,
  preparation: null,
  preparationRunId: null,
  reviewRunId: null,
  myRunId: null,
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

// True when the logged-in user is an owner/admin — the internal tooling is theirs, a
// plain member only gets the prep flow (admin-access-guard Phase 2). Handles both shapes
// we store: me() gives { roles: [...] }, login() gives a PublicUser { role: "..." }.
export function isAdmin(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  return roles.includes("owner") || roles.includes("admin");
}

export function resetSession() {
  // Preserve the logged-in user across a session reset — "new session" clears the
  // run, not the login.
  const user = store.user;
  Object.assign(store, { ...initial, user, ctx: { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" } });
  try { localStorage.removeItem("seroSessionId"); } catch {}
}
