import { createSession } from "../engine/session.ts";
import { initState } from "../engine/axes.ts";
import { createTracker } from "../engine/cost.ts";
import { INTRO_BUDGET, DYNAMIC_BUDGET, TOTAL_BUDGET } from "../engine/budgets.ts";
import { persist, loadPersistedSessions, restoreFromDisk } from "./session-persistence.ts";
import { hasDatabaseUrl } from "../db/client.ts";
import { loadSessionsFromDb } from "../db/sessions-store.ts";
import type { Session, MeetingContext } from "../shared/session.types.ts";
import type { Question } from "../shared/question.types.ts";

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 2 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CONCURRENT = 50;

const sessions = new Map<string, Session>();

function createWebSession(ctx: MeetingContext, introQueue: Question[], orgId: string | null = null, userId: string | null = null, personId: string | null = null): Session {
  if (sessions.size >= MAX_CONCURRENT) {
    throw Object.assign(new Error("Too many concurrent sessions"), { status: 503 });
  }
  const inner = createSession();
  const state: Session = {
    id: inner.id,
    dir: inner.dir,
    orgId,
    userId,
    personId,
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
  // When Postgres is configured, also restore live sessions from the database on
  // boot — so a session survives a server restart, loaded from the DB. Async +
  // best-effort: a DB hiccup logs and leaves the disk-restored set in place.
  if (hasDatabaseUrl()) {
    loadSessionsFromDb(sessions, SESSION_TTL_MS)
      .then((n) => {
        if (n) console.log(`[sessions] restored ${n} session(s) from Postgres`);
      })
      .catch((e) => console.warn("[sessions] Postgres restore failed:", e instanceof Error ? e.message : String(e)));
  }
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
