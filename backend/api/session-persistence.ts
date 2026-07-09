import fs from "node:fs";
import path from "node:path";
import { LOGS_ROOT } from "../engine/session.ts";
import { findRunDir } from "../engine/run-history.ts";
import { initState } from "../engine/axes.ts";
import { createTracker } from "../engine/cost.ts";
import type { Session } from "../shared/session.types.ts";
import { isObjectRecord } from "../shared/guards.ts";
import { hasDatabaseUrl } from "../db/client.ts";
import { shouldEchoToDisk } from "../db/run-artifacts-store.ts";

const STATE_FILE = "session-state.json";

// The on-disk shape: every Session field except the runtime-only ones (Maps +
// tracker), which are rebuilt by hydrateSession on restore.
type PersistedSession = Omit<Session, "lastPlanByTurn" | "inFlight" | "tracker">;

// On-disk state is the closed output of serialize() below; a present string id
// is the one integrity check the original made (`if (!s.id) return null`).
// hydrateSession backfills the few fields older state files may lack.
function isPersistedSession(v: unknown): v is PersistedSession {
  return isObjectRecord(v) && typeof v.id === "string";
}

// Fields that are safe to persist and restore (skip ephemeral Maps and functions)
function serialize(s: Session): PersistedSession {
  return {
    id: s.id,
    dir: s.dir,
    orgId: s.orgId ?? null,
    userId: s.userId ?? null,
    personId: s.personId ?? null, // people-roster Phase 2: the roster person this 1:1 is about

    createdAt: s.createdAt,
    completedAt: s.completedAt ?? null,
    lastSeenAt: s.lastSeenAt,
    ctx: s.ctx,
    introQueue: s.introQueue,
    focusPointsResult: s.focusPointsResult,
    selectedFocusPoints: s.selectedFocusPoints,
    preparationResult: s.preparationResult,
    bankReady: s.bankReady,
    briefing: s.briefing,
    queueRef: s.queueRef,
    axisState: s.axisState,
    transcript: s.transcript,
    turn: s.turn,
    totalBudget: s.totalBudget,
    closer: s.closer,
    prepOpener: s.prepOpener ?? null,
    sessionBank: s.sessionBank ?? null,
    pendingAnswer: s.pendingAnswer,
    turnSnapshots: s.turnSnapshots ?? [],
    notes: s.notes || [],
    agendaInput: s.agendaInput ?? null,
    agendaInjected: Boolean(s.agendaInjected),
    agendaCovered: s.agendaCovered ?? null,
    outcomeCheck: s.outcomeCheck ?? null, // loop-closure capture (no-inference ruling, spec §6)
    mode: s.mode || "manual",
    runLabel: s.runLabel ?? null,
    fingerprint: s.fingerprint ?? null,
    scriptAnswers: s.scriptAnswers ?? null,
    scriptedFallback: s.scriptedFallback ?? null,
    scriptCoverage: s.scriptCoverage ?? null,
    verdict: s.verdict ?? null,
  };
}

function persist(session: Session): void {
  // Retire the files (postgres-runtime-data P7): in DB mode Postgres is the store,
  // so skip the disk write unless the dev echo is on. DB-less mode always writes —
  // disk IS the store there, and the echo copy is the one-flip rollback path.
  if (hasDatabaseUrl() && !shouldEchoToDisk()) return;
  try {
    fs.writeFileSync(
      path.join(session.dir, STATE_FILE),
      JSON.stringify(serialize(session), null, 2)
    );
  } catch (e) {
    console.warn("[session-persistence] write failed:", e instanceof Error ? e.message : e);
  }
}

function hydrateSession(s: PersistedSession, sessionDir: string): Session {
  // Trust the on-disk location over the serialised `dir` field — old
  // state files have a pre-move absolute path baked in.
  return {
    ...s,
    dir: sessionDir,
    turnSnapshots: Array.isArray(s.turnSnapshots) ? s.turnSnapshots : [],
    agendaInjected: s.agendaInjected == null ? false : s.agendaInjected,
    agendaCovered: s.agendaCovered === undefined ? null : s.agendaCovered,
    agendaInput: s.agendaInput === undefined ? null : s.agendaInput,
    axisState: !s.axisState || typeof s.axisState !== "object" ? initState() : s.axisState,
    lastPlanByTurn: new Map(),
    inFlight: new Map(),
    tracker: createTracker(),
  };
}

function restoreSessionAtDir(
  sessionDir: string,
  sessions: Map<string, Session>,
  { ttlCutoff }: { ttlCutoff?: number } = {}
): Session | null {
  const stateFile = path.join(sessionDir, STATE_FILE);
  if (!fs.existsSync(stateFile)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (!isPersistedSession(parsed)) return null;
    if (ttlCutoff != null && parsed.lastSeenAt < ttlCutoff) return null;
    const existing = sessions.get(parsed.id);
    if (existing) return existing;
    const hydrated = hydrateSession(parsed, sessionDir);
    sessions.set(parsed.id, hydrated);
    return hydrated;
  } catch {
    return null;
  }
}

function restoreFromDisk(id: string, sessions: Map<string, Session>): Session | null {
  const existing = sessions.get(id);
  if (existing) return existing;
  const sessionDir = findRunDir(id);
  if (!sessionDir) return null;
  const s = restoreSessionAtDir(sessionDir, sessions);
  return s && s.id === id ? s : null;
}

function loadPersistedSessions(sessions: Map<string, Session>, ttlMs: number): void {
  if (!fs.existsSync(LOGS_ROOT)) return;
  const ttlCutoff = Date.now() - ttlMs;
  let restored = 0;
  for (const monthEntry of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!monthEntry.isDirectory()) continue;
    const monthDir = path.join(LOGS_ROOT, monthEntry.name);
    let sessionEntries;
    try {
      sessionEntries = fs.readdirSync(monthDir, { withFileTypes: true });
    } catch { continue; }
    for (const entry of sessionEntries) {
      if (!entry.isDirectory()) continue;
      const sessionDir = path.join(monthDir, entry.name);
      const sizeBefore = sessions.size;
      restoreSessionAtDir(sessionDir, sessions, { ttlCutoff });
      if (sessions.size > sizeBefore) restored++;
    }
  }
  if (restored > 0) console.log(`[session-persistence] restored ${restored} session(s) from disk`);
}

export { persist, loadPersistedSessions, restoreFromDisk, hydrateSession, serialize };
export type { PersistedSession };
