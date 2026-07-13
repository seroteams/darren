// Data access for Monthly Check-in guided sessions (monthly-one-on-one Phase 1) —
// the storage seam, Postgres-backed. Its own table (never `sessions`): the interview
// pipeline's boot-hydration + list reads assume the interview state shape. Every read
// is fenced by org_id + manager_id — the repo never answers across that wall. The
// service depends on this interface, so it's unit-tested against an in-memory fake
// without a database.

import { and, eq, desc } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { guidedSessions } from "../../../db/schema.ts";

/** One guided-session row as stored. `state` is the whole draft (jsonb). */
export interface GuidedSessionRow {
  id: string;
  orgId: string;
  managerId: string;
  personId: string;
  personName: string;
  stage: string;
  state: unknown;
  engagement: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface GuidedSessionsRepo {
  create(fields: {
    orgId: string;
    managerId: string;
    personId: string;
    personName: string;
    stage: string;
    state: unknown;
  }): Promise<GuidedSessionRow>;
  /** One row, fenced — null when the id isn't this manager's (or this org's). */
  findForManager(id: string, orgId: string, managerId: string): Promise<GuidedSessionRow | null>;
  /** This person's guided sessions for this manager, newest first. */
  listForPerson(personId: string, orgId: string, managerId: string): Promise<GuidedSessionRow[]>;
  update(
    id: string,
    patch: { stage?: string; state?: unknown; engagement?: number | null; completedAt?: Date | null },
  ): Promise<void>;
}

// guided_sessions.org_id / manager_id / person_id are uuid columns. A synthetic dev
// identity (DEV_AUTOLOGIN) carries non-uuid ids like "dev-org"/"dev-user"; comparing a
// uuid column to that literal throws "invalid input syntax for type uuid" — a 500. A
// non-uuid caller provably owns no uuid-keyed rows, so short-circuit before the DB
// (same guard the people repo uses).
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

export const pgGuidedSessionsRepo: GuidedSessionsRepo = {
  async create(fields) {
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
    return rows[0]!;
  },
  async findForManager(id, orgId, managerId) {
    if (!isUuid(id) || !isUuid(orgId) || !isUuid(managerId)) return null;
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(guidedSessions)
      .where(and(eq(guidedSessions.id, id), eq(guidedSessions.orgId, orgId), eq(guidedSessions.managerId, managerId)))
      .limit(1);
    return rows[0] ?? null;
  },
  async listForPerson(personId, orgId, managerId) {
    if (!isUuid(personId) || !isUuid(orgId) || !isUuid(managerId)) return [];
    const db = getDb();
    return db
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
  },
  async update(id, patch) {
    const db = getDb();
    await db
      .update(guidedSessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(guidedSessions.id, id));
  },
};
