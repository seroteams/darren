import { createSession } from "../engine/session.ts";
import { initState } from "../engine/axes.ts";
import { createTracker } from "../engine/cost.ts";
import { INTRO_BUDGET, DYNAMIC_BUDGET, TOTAL_BUDGET } from "../engine/budgets.ts";
import { persist, loadPersistedSessions, restoreFromDisk } from "./session-persistence.ts";
import type { Session, MeetingContext, AxisState } from "../shared/session.types.ts";
import type { Question } from "../shared/question.types.ts";

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 2 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CONCURRENT = 50;

const sessions = new Map<string, Session>();

function createWebSession(ctx: MeetingContext, introQueue: Question[]): Session {
  if (sessions.size >= MAX_CONCURRENT) {
    throw Object.assign(new Error("Too many concurrent sessions"), { status: 503 });
  }
  const inner = createSession();
  const state: Session = {
    id: inner.id,
    dir: inner.dir,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    completedAt: null,

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
    turnSnapshots: [],

    pendingAnswer: null,
    inFlight: new Map(),
    tracker: createTracker(),
  };
  sessions.set(inner.id, state);
  persist(state);
  return state;
}

function getSession(id: string): Session | undefined {
  let s = sessions.get(id);
  if (!s) s = restoreFromDisk(id, sessions) ?? undefined;
  if (s) s.lastSeenAt = Date.now();
  return s;
}

function requireSession(id: string): Session {
  const s = getSession(id);
  if (!s) {
    throw Object.assign(new Error(`Unknown session: ${id}`), { status: 404 });
  }
  return s;
}

function dropSession(id: string): void {
  sessions.delete(id);
}

function snapshot(s: Session) {
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

function summarizeAxes(axisState: AxisState) {
  return Object.values(axisState).map((a) => ({
    id: a.id,
    label: a.label,
    score: a.score,
    lastDelta: a.lastDelta,
    historyLen: (a.history && a.history.length) || 0,
  }));
}

function inferStage(s: Session): string {
  if (s.briefing) return "BRIEFING";
  if (s.turn >= s.totalBudget) return "EVAL";
  if (s.bankReady) return "QUESTIONING";
  if (s.focusPointsResult && s.preparationResult) return "BANK";
  if (s.focusPointsResult) return "PREPARATION";
  return "FOCUS_POINTS";
}

function startSweep(): void {
  loadPersistedSessions(sessions, SESSION_TTL_MS);
  setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, s] of sessions) {
      if (s.lastSeenAt < cutoff) sessions.delete(id);
    }
  }, SWEEP_INTERVAL_MS).unref?.();
}

export {
  createWebSession,
  getSession,
  requireSession,
  dropSession,
  snapshot,
  inferStage,
  summarizeAxes,
  startSweep,
  persist as persistSession,
  sessions,
  INTRO_BUDGET,
  DYNAMIC_BUDGET,
  TOTAL_BUDGET,
};
