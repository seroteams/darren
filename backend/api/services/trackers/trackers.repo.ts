// Data access for per-person trackers (monthly-one-on-one Phase 2) — the storage seam,
// Postgres-backed. Promises / requests / goals live in ONE table keyed by `kind`. Every
// read is fenced to the caller's org; the service adds the person-ownership fence on top
// (a manager only touches trackers for people they manage). Unit-tested against an
// in-memory fake — no DB needed.

import { and, eq, desc } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { trackerItems } from "../../../db/schema.ts";

/** One dated, append-only history event (status change, note, progress move, outcome). */
export interface TrackerHistoryEvent {
  at: string; // ISO
  text: string;
}

export interface TrackerItemRow {
  id: string;
  orgId: string;
  personId: string;
  createdByUserId: string | null;
  kind: string;
  text: string;
  owner: string | null;
  category: string | null;
  status: string;
  progress: number | null;
  history: TrackerHistoryEvent[];
  createdSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackersRepo {
  /** All of a person's tracker items (any kind/status), newest first — the service groups + filters. */
  listForPerson(personId: string, orgId: string): Promise<TrackerItemRow[]>;
  /** One item, org-fenced — null when it isn't this org's (the service then checks person ownership). */
  findForOrg(id: string, orgId: string): Promise<TrackerItemRow | null>;
  insert(fields: {
    orgId: string;
    personId: string;
    createdByUserId: string | null;
    kind: "promise" | "request" | "goal";
    text: string;
    owner: string | null;
    category: string | null;
    status: string;
    progress: number | null;
    history: TrackerHistoryEvent[];
    createdSessionId: string | null;
  }): Promise<TrackerItemRow>;
  update(
    id: string,
    patch: { status?: string; progress?: number | null; history?: TrackerHistoryEvent[] },
  ): Promise<void>;
}

// uuid guard — a synthetic dev identity (DEV_AUTOLOGIN) carries non-uuid ids; comparing a
// uuid column to them throws. A non-uuid caller owns no uuid-keyed rows (same as the other repos).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

const COLUMNS = {
  id: trackerItems.id,
  orgId: trackerItems.orgId,
  personId: trackerItems.personId,
  createdByUserId: trackerItems.createdByUserId,
  kind: trackerItems.kind,
  text: trackerItems.text,
  owner: trackerItems.owner,
  category: trackerItems.category,
  status: trackerItems.status,
  progress: trackerItems.progress,
  history: trackerItems.history,
  createdSessionId: trackerItems.createdSessionId,
  createdAt: trackerItems.createdAt,
  updatedAt: trackerItems.updatedAt,
};

// jsonb comes back as unknown — normalise to the event array shape.
function normalizeRow(row: Record<string, unknown>): TrackerItemRow {
  const history = Array.isArray(row.history) ? (row.history as TrackerHistoryEvent[]) : [];
  return { ...(row as unknown as TrackerItemRow), history };
}

export const pgTrackersRepo: TrackersRepo = {
  async listForPerson(personId, orgId) {
    if (!isUuid(personId) || !isUuid(orgId)) return [];
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(trackerItems)
      .where(and(eq(trackerItems.personId, personId), eq(trackerItems.orgId, orgId)))
      .orderBy(desc(trackerItems.createdAt));
    return rows.map(normalizeRow);
  },
  async findForOrg(id, orgId) {
    if (!isUuid(id) || !isUuid(orgId)) return null;
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(trackerItems)
      .where(and(eq(trackerItems.id, id), eq(trackerItems.orgId, orgId)))
      .limit(1);
    return rows[0] ? normalizeRow(rows[0]) : null;
  },
  async insert(fields) {
    const db = getDb();
    const rows = await db.insert(trackerItems).values(fields).returning(COLUMNS);
    return normalizeRow(rows[0]!);
  },
  async update(id, patch) {
    const db = getDb();
    await db
      .update(trackerItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(trackerItems.id, id));
  },
};
