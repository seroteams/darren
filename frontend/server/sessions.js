const path = require("node:path");
const { createSession } = require("../../src/session");
const { initState } = require("../../src/axes");
const cost = require("../../src/cost");
const { INTRO_BUDGET, DYNAMIC_BUDGET, TOTAL_BUDGET } = require("../../src/budgets");
const { persist, loadPersistedSessions, restoreFromDisk } = require("./session-persistence");

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 2 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CONCURRENT = 50;

const sessions = new Map();

function createWebSession(ctx, introQueue) {
  if (sessions.size >= MAX_CONCURRENT) {
    const err = new Error("Too many concurrent sessions");
    err.status = 503;
    throw err;
  }
  const inner = createSession();
  const state = {
    id: inner.id,
    dir: inner.dir,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),

    ctx,
    introQueue,

    focusPointsResult: null,
    preparationResult: null,
    bankReady: false,
    briefing: null,

    queueRef: [...introQueue],
    axisState: initState(),
    transcript: [],
    turn: 0,
    totalBudget: TOTAL_BUDGET,
    closer: null,
    prepOpener: null,
    notes: [],

    agendaInput: null,
    agendaInjected: false,
    agendaCovered: null,

    lastPlanByTurn: new Map(),

    pendingAnswer: null,
    pendingDrillRequest: false,
    showReturningToArcHint: false,
    inFlight: new Map(),
    tracker: cost.createTracker(),
  };
  sessions.set(inner.id, state);
  persist(state);
  return state;
}

function getSession(id) {
  let s = sessions.get(id);
  if (!s) s = restoreFromDisk(id, sessions);
  if (s) s.lastSeenAt = Date.now();
  return s;
}

function requireSession(id) {
  const s = getSession(id);
  if (!s) {
    const err = new Error(`Unknown session: ${id}`);
    err.status = 404;
    throw err;
  }
  return s;
}

function dropSession(id) {
  sessions.delete(id);
}

function snapshot(s) {
  return {
    sessionId: s.id,
    sessionDir: s.dir,
    stage: inferStage(s),
    ctx: s.ctx,
    focusPoints: s.focusPointsResult,
    preparation: s.preparationResult,
    bankReady: s.bankReady,
    turn: s.turn,
    totalBudget: s.totalBudget,
    axes: summarizeAxes(s.axisState),
    briefing: s.briefing,
    notes: s.notes || [],
    agenda: { summary: s.agendaInput?.summary ?? null, covered: s.agendaCovered ?? null },
    mode: s.mode || "manual",
    runLabel: s.runLabel ?? null,
    scripted: s.mode === "scripted"
      ? {
          mode: "scripted",
          personaId: s.fingerprint?.personaId ?? null,
          fallback: s.scriptedFallback || "",
          answers: s.scriptAnswers || {},
        }
      : null,
    createdAt: s.createdAt,
    completedAt: s.completedAt ?? null,
  };
}

function summarizeAxes(axisState) {
  return Object.values(axisState).map((a) => ({
    id: a.id,
    label: a.label,
    score: a.score,
    lastDelta: a.lastDelta,
    historyLen: (a.history && a.history.length) || 0,
  }));
}

function inferStage(s) {
  if (s.briefing) return "BRIEFING";
  if (s.turn >= s.totalBudget) return "EVAL";
  if (s.bankReady) return "QUESTIONING";
  if (s.focusPointsResult && s.preparationResult) return "BANK";
  if (s.focusPointsResult) return "PREPARATION";
  return "FOCUS_POINTS";
}

function startSweep() {
  loadPersistedSessions(sessions, SESSION_TTL_MS);
  setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, s] of sessions) {
      if (s.lastSeenAt < cutoff) sessions.delete(id);
    }
  }, SWEEP_INTERVAL_MS).unref?.();
}

module.exports = {
  createWebSession,
  getSession,
  requireSession,
  dropSession,
  snapshot,
  summarizeAxes,
  startSweep,
  persistSession: persist,
  sessions,
  INTRO_BUDGET,
  DYNAMIC_BUDGET,
  TOTAL_BUDGET,
};
