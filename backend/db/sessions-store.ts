// The durable Postgres layer for sessions — the async functions the (sync)
// pgSessionsRepo mirrors to, and the boot-restore reads from. Kept separate from
// the repo so it can be awaited directly (the repo interface is sync, so the repo
// fires these fire-and-forget; tests + boot await them).
//
// The session's serializable state goes into sessions.state (jsonb), reusing the
// exact serialize()/hydrateSession() the on-disk persistence uses — so disk and DB
// store the identical shape. The on-disk run dir is kept (log_dir) for the
// log-only artifacts that stay on disk.

import { eq } from "drizzle-orm";
import { getDb } from "./client.ts";
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

/** Delete a session row by its slug id (test cleanup / future hard-delete). */
export async function deleteSession(key: string): Promise<void> {
  await getDb().delete(sessionsTable).where(eq(sessionsTable.sessionKey, key));
}

/** Boot-restore: load non-expired sessions from Postgres into the live Map, so a
 *  session survives a server restart (loaded from the DB, not a file). Returns the
 *  count restored. */
export async function loadSessionsFromDb(into: Map<string, Session>, ttlMs: number): Promise<number> {
  const rows = await getDb().select().from(sessionsTable);
  const cutoff = Date.now() - ttlMs;
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
