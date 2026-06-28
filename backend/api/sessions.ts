import { createSession } from "../engine/session.ts";
import { initState } from "../engine/axes.ts";
import { createTracker } from "../engine/cost.ts";
import { INTRO_BUDGET, DYNAMIC_BUDGET, TOTAL_BUDGET } from "../engine/budgets.ts";
import { persist, loadPersistedSessions, restoreFromDisk } from "./session-persistence.ts";
import type { Session, MeetingContext } from "../shared/session.types.ts";
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
  startSweep,
  persist as persistSession,
  sessions,
  INTRO_BUDGET,
  DYNAMIC_BUDGET,
  TOTAL_BUDGET,
};
