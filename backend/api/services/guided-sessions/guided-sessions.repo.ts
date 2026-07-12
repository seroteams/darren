// Data access for guided sessions (monthly-checkin Phase 1) — the storage seam,
// Postgres-backed. A guided session is a manager-walked 1:1 (Monthly Check-in); its own
// table, welded to nothing in the interview `sessions` pipeline. Every read is fenced by
// org_id + manager_id — the repo never answers across that wall. The service depends on
// the interface, so it's unit-tested against an in-memory fake without a database.

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { guidedSessions } from "../../../db/schema.ts";

/** The session draft blob. `v`/`arc`/`step`/`visited` are the runner's spine; the
 *  per-stage drafts under other keys are opaque to the server (the client owns their shape). */
export interface GuidedSessionState {
  v: number;
  arc: string;
  step: number;
  visited: number[];
  [key: string]: unknown;
}

/** One guided-session row as stored. */
export interface GuidedSessionRow {
  id: string;
  orgId: string;
  managerId: string;
  personId: string;
  personName: string;
  stage: string;
  state: GuidedSessionState;
  engagement: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface GuidedSessionsRepo {
  insert(fields: {
    orgId: string;
    managerId: string;
    personId: string;
    personName: string;
    stage: string;
    state: GuidedSessionState;
  }): Promise<GuidedSessionRow>;
  /** One row, fenced — null when the id isn't this manager's (or this org's). */
  findForManager(id: string, orgId: string, managerId: string): Promise<GuidedSessionRow | null>;
  /** This person's sessions for this manager, newest first. */
  listForPerson(personId: string, orgId: string, managerId: string): Promise<GuidedSessionRow[]>;
  update(
    id: string,
    patch: { stage?: string; state?: GuidedSessionState; engagement?: number | null; completedAt?: Date | null },
  ): Promise<void>;
}

// org_id / manager_id / person_id are uuid columns. A synthetic dev identity
// (DEV_AUTOLOGIN) carries non-uuid ids; comparing a uuid column to that literal throws a
// 500. A non-uuid caller provably owns no uuid-keyed rows, so short-circuit reads to empty
// before touching the DB (same guard the people repo uses).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

const COLUMNS = {
  id: guidedSessions.id,
  orgId: guidedSessions.orgId,
  managerId: guidedSessions.managerId,
  personId: guidedSessions.personId,
  personName: guidedSessions.personName,
  stage: guidedSessions.stage,
  state: guidedSessions.state,
  engagement: guidedSessions.engagement,
  createdAt: guidedSessions.createdAt,
  updatedAt: guidedSessions.updatedAt,
  completedAt: guidedSessions.completedAt,
};

// drizzle types the jsonb column as unknown — cast at the storage boundary (like the
// sessions store); the service treats state.v/arc/step/visited as the spine.
type RawRow = Omit<GuidedSessionRow, "state"> & { state: unknown };
const toRow = (r: RawRow): GuidedSessionRow => ({ ...r, state: r.state as GuidedSessionState });

export const pgGuidedSessionsRepo: GuidedSessionsRepo = {
  async insert(fields) {
    const db = getDb();
    const rows = await db
      .insert(guidedSessions)
      .values({
        orgId: fields.orgId,
        managerId: fields.managerId,
        personId: fields.personId,
        personName: fields.personName,
        stage: fields.stage,
        state: fields.state,
      })
      .returning(COLUMNS);
    return toRow(rows[0]! as RawRow);
  },
  async findForManager(id, orgId, managerId) {
    if (!isUuid(id) || !isUuid(orgId) || !isUuid(managerId)) return null;
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(guidedSessions)
      .where(
        and(
          eq(guidedSessions.id, id),
          eq(guidedSessions.orgId, orgId),
          eq(guidedSessions.managerId, managerId),
        ),
      )
      .limit(1);
    return rows[0] ? toRow(rows[0] as RawRow) : null;
  },
  async listForPerson(personId, orgId, managerId) {
    if (!isUuid(personId) || !isUuid(orgId) || !isUuid(managerId)) return [];
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(guidedSessions)
      .where(
        and(
          eq(guidedSessions.personId, personId),
          eq(guidedSessions.orgId, orgId),
          eq(guidedSessions.managerId, managerId),
        ),
      )
      .orderBy(desc(guidedSessions.createdAt));
    return rows.map((r) => toRow(r as RawRow));
  },
  async update(id, patch) {
    const db = getDb();
    await db
      .update(guidedSessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(guidedSessions.id, id));
  },
};
