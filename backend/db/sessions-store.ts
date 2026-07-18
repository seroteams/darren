// The durable Postgres layer for sessions — the async functions the (sync)
// pgSessionsRepo mirrors to, and the boot-restore reads from. Kept separate from
// the repo so it can be awaited directly (the repo interface is sync, so the repo
// fires these fire-and-forget; tests + boot await them).
//
// The session's serializable state goes into sessions.state (jsonb), reusing the
// exact serialize()/hydrateSession() the on-disk persistence uses — so disk and DB
// store the identical shape. The on-disk run dir is kept (log_dir) for the
// log-only artifacts that stay on disk.

import { eq, gte } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "./client.ts";
import { organizations, sessions as sessionsTable } from "./schema.ts";
import { serialize, hydrateSession } from "../api/session-persistence.ts";
import type { PersistedSession } from "../api/session-persistence.ts";
import type { Session } from "../shared/session.types.ts";

// A single placeholder org until auth (Phase 006) creates real ones. Every session
// row needs an org_id (the locked multi-tenant rule); this is the bridge.
export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

let orgEnsured = false;
/** Insert the placeholder org once per process (no-op if it already exists). */
export async function ensureDefaultOrg(): Promise<void> {
  if (orgEnsured) return;
  await getDb()
    .insert(organizations)
    .values({ id: DEFAULT_ORG_ID, name: "Default (pre-auth)" })
    .onConflictDoNothing();
  orgEnsured = true;
}

/** The index columns denormalized from the session state at upsert time — so run
 *  listings are indexed SQL, not jsonb scans. `state` stays the authoritative copy.
 *  (postgres-runtime-data Phase 2.) */
function indexColumns(session: Session) {
  return {
    userId: session.userId ?? null,
    personId: session.personId ?? null,
    personName: session.ctx?.name ?? null,
    role: session.ctx?.role ?? null,
    seniority: session.ctx?.seniority ?? null,
    meetingType: session.ctx?.meetingType ?? null,
    finished: Boolean(session.briefing),
    lastSeenAt: session.lastSeenAt ?? 0,
    mode: session.mode ?? null,
    personaId: session.fingerprint?.personaId ?? null,
    runLabel: session.runLabel ?? null,
  };
}

/** Upsert a session's current state into Postgres, keyed by its slug id. */
export async function upsertSession(session: Session): Promise<void> {
  await ensureDefaultOrg();
  const state = serialize(session);
  const completedAt = session.completedAt ? new Date(session.completedAt) : null;
  const cols = indexColumns(session);
  await getDb()
    .insert(sessionsTable)
    .values({ orgId: session.orgId ?? DEFAULT_ORG_ID, sessionKey: session.id, state, logDir: session.dir, completedAt, ...cols })
    .onConflictDoUpdate({
      target: sessionsTable.sessionKey,
      // orgId updates too: a guest run CLAIMED after login moves from the
      // placeholder org to the caller's — without this the org-fenced reads
      // (Phase 3) would never list the claimed run.
      set: { orgId: session.orgId ?? DEFAULT_ORG_ID, state, logDir: session.dir, completedAt, updatedAt: new Date(), ...cols },
    });
}

/** Read one session back from Postgres by its slug id; null when absent. */
export async function readSession(key: string): Promise<Session | null> {
  const rows = await getDb()
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sessionKey, key))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const state = row.state as PersistedSession;
  return hydrateSession(state, state.dir);
}

/** A per-key write queue that COALESCES: at most one write per key in flight,
 *  and while one runs only the LATEST queued item is kept — every session upsert
 *  writes the full current state, so intermediates are redundant. This bounds the
 *  mirror's pool usage to one client per active session no matter how often
 *  persist() fires. (Regression 2026-07-08: one unbounded fire-and-forget upsert
 *  per persist() call let same-row writes pile up, each holding a pool client,
 *  until the pool starved and every DB request hung.) */
export interface WriteQueue<T> {
  enqueue(key: string, item: T): void;
  /** Wait until every queued write has settled. */
  flush(): Promise<void>;
}

export function createWriteQueue<T>(
  write: (item: T) => Promise<void>,
  onError: (key: string, e: unknown) => void = (key, e) =>
    console.warn(`[sessions.pg] mirror write failed (${key}):`, e instanceof Error ? e.message : String(e)),
): WriteQueue<T> {
  const inFlight = new Map<string, Promise<void>>();
  const pending = new Map<string, T>();

  function start(key: string, item: T): void {
    const run = write(item)
      .catch((e) => onError(key, e))
      .then(() => {
        inFlight.delete(key);
        const next = pending.get(key);
        if (next !== undefined) {
          pending.delete(key);
          start(key, next);
        }
      });
    inFlight.set(key, run);
  }

  return {
    enqueue(key, item) {
      if (inFlight.has(key)) {
        pending.set(key, item); // supersede any queued intermediate state
        return;
      }
      start(key, item);
    },
    async flush() {
      // A finishing write may start the pending one — loop until truly drained.
      while (inFlight.size > 0) await Promise.allSettled([...inFlight.values()]);
    },
  };
}

// Escalation sink for repeated mirror-write failures (audit F8). The DB layer can't
// import the API error-log (layering + cycle), so the server wires this at boot. When a
// session's mirror write fails several times in a row, we stop swallowing silently and
// surface it — a failing mirror means that in-progress run only exists in memory and dies
// on the next restart. Consecutive count resets on the first success.
type MirrorFailureSink = (key: string, message: string) => void;
let mirrorFailureSink: MirrorFailureSink | null = null;
export function setMirrorFailureSink(sink: MirrorFailureSink | null): void {
  mirrorFailureSink = sink;
}
const MIRROR_FAILURE_ESCALATE_AT = 3;
const consecutiveMirrorFailures = new Map<string, number>();

const sessionWrites = createWriteQueue<Session>(
  // Reset the failure streak on a successful mirror; the onError below counts failures.
  (s) => upsertSession(s).then(() => { consecutiveMirrorFailures.delete(s.id); }),
  (key, e) => {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[sessions.pg] mirror write failed (${key}):`, message);
    const n = (consecutiveMirrorFailures.get(key) || 0) + 1;
    consecutiveMirrorFailures.set(key, n);
    if (n >= MIRROR_FAILURE_ESCALATE_AT) {
      console.error(`[sessions.pg] mirror write failing repeatedly (${key}, ${n}x) — run may be lost on restart`);
      mirrorFailureSink?.(key, `session mirror write failed ${n}x in a row: ${message}`);
    }
  },
);

/** Queue a session mirror upsert (the sync facade pgSessionsRepo calls). Coalesced
 *  per session; errors are logged and swallowed; no-op without a database. */
export function queueSessionUpsert(session: Session): void {
  if (!hasDatabaseUrl()) return;
  sessionWrites.enqueue(session.id, session);
}

/** Wait for queued session mirrors to settle (tests + server shutdown). */
export function flushSessionWrites(): Promise<void> {
  return sessionWrites.flush();
}

/** Delete a session row by its slug id (test cleanup / future hard-delete). */
export async function deleteSession(key: string): Promise<void> {
  await getDb().delete(sessionsTable).where(eq(sessionsTable.sessionKey, key));
}

/** The boot-restore SELECT, pre-narrowed in SQL on the indexed last_seen_at
 *  column so expired rows (with their big state jsonb) never leave the database.
 *  (Regression 2026-07-10: selecting the whole table on every API restart moved
 *  ~8 GB of Neon network transfer in one day.) */
export function liveSessionsQuery(cutoff: number) {
  return getDb().select().from(sessionsTable).where(gte(sessionsTable.lastSeenAt, cutoff));
}

/** Boot-restore: load non-expired sessions from Postgres into the live Map, so a
 *  session survives a server restart (loaded from the DB, not a file). Returns the
 *  count restored. */
export async function loadSessionsFromDb(into: Map<string, Session>, ttlMs: number): Promise<number> {
  const cutoff = Date.now() - ttlMs;
  // SQL pre-narrows on the denormalized last_seen_at; the state.lastSeenAt check
  // below stays the authoritative wall (state is the authoritative copy).
  const rows = await liveSessionsQuery(cutoff);
  let restored = 0;
  for (const row of rows) {
    const state = row.state as PersistedSession;
    if (state.lastSeenAt < cutoff) continue;
    if (into.has(state.id)) continue;
    into.set(state.id, hydrateSession(state, state.dir));
    restored++;
  }
  return restored;
}
