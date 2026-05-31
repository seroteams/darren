// Minimal state store + machine transitions. No dependencies.

export const STAGES = Object.freeze({
  START: "START",
  INTAKE: "INTAKE",
  FOCUS_POINTS: "FOCUS_POINTS",
  PREPARATION: "PREPARATION",
  BANK: "BANK",
  QUESTIONING: "QUESTIONING",
  EVAL: "EVAL",
  BRIEFING: "BRIEFING",
  LEXICON_REVIEW: "LEXICON_REVIEW",
  ERROR: "ERROR",
});

const initial = {
  sessionId: null,
  stage: STAGES.START,
  substage: "NAME",
  turn: 0,
  totalBudget: 9,
  ctx: { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" },
  focusPoints: null,
  preparation: null,
  preparationRunId: null,
  currentQuestion: null,
  axes: [],
  briefing: null,
  notes: [],
  sessionDir: null,
  createdAt: null,
  completedAt: null,
  error: null,
  retryStage: null,
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

export function resetSession() {
  Object.assign(store, { ...initial, ctx: { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" } });
  try { localStorage.removeItem("seroSessionId"); } catch {}
}
