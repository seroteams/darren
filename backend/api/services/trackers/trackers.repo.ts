// Data access for tracker items (monthly-checkin Phase 2) — promises · requests · goals in
// ONE table keyed by `kind`. The storage seam, Postgres-backed. Every read is fenced by
// org_id (+ person_id); the manager-ownership check (the person is the caller's) is the
// service's job via the people repo. Unit-tested against an in-memory fake.

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { trackerItems } from "../../../db/schema.ts";

export type TrackerKind = "promise" | "request" | "goal";

/** A dated event on a tracked item — the audit trail the side panel renders. */
export interface TrackerEvent {
  at: string; // ISO timestamp
  type: string; // created | status | progress | note | outcome
  from?: string;
  to?: string;
  note?: string;
  by?: string; // user id who made the change
}

export interface TrackerItemRow {
  id: string;
  orgId: string;
  personId: string;
  createdByUserId: string | null;
  kind: TrackerKind;
  text: string;
  owner: string | null; // promise: "manager" | "member"
  category: string | null; // request category
  status: string;
  progress: number; // goal 0–100
  history: TrackerEvent[];
  createdSessionId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackersRepo {
  /** Every item for this person in this org — archived included; the service filters. */
  listForPerson(personId: string, orgId: string): Promise<TrackerItemRow[]>;
  /** One item, org-fenced — null when the id isn't this org's. */
  findById(id: string, orgId: string): Promise<TrackerItemRow | null>;
  insert(fields: {
    orgId: string;
    personId: string;
    createdByUserId: string | null;
    kind: TrackerKind;
    text: string;
    owner: string | null;
    category: string | null;
    status: string;
    progress: number;
    history: TrackerEvent[];
    createdSessionId: string | null;
  }): Promise<TrackerItemRow>;
  update(
    id: string,
    patch: Partial<
      Pick<TrackerItemRow, "text" | "owner" | "category" | "status" | "progress" | "history" | "archivedAt">
    >,
  ): Promise<void>;
}

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
  archivedAt: trackerItems.archivedAt,
  createdAt: trackerItems.createdAt,
  updatedAt: trackerItems.updatedAt,
};

type RawRow = Omit<TrackerItemRow, "history" | "kind"> & { history: unknown; kind: string };
const toRow = (r: RawRow): TrackerItemRow => ({
  ...r,
  kind: r.kind as TrackerKind,
  history: Array.isArray(r.history) ? (r.history as TrackerEvent[]) : [],
});

export const pgTrackersRepo: TrackersRepo = {
  async listForPerson(personId, orgId) {
    if (!isUuid(personId) || !isUuid(orgId)) return [];
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(trackerItems)
      .where(and(eq(trackerItems.personId, personId), eq(trackerItems.orgId, orgId)))
      .orderBy(asc(trackerItems.createdAt));
    return rows.map((r) => toRow(r as RawRow));
  },
  async findById(id, orgId) {
    if (!isUuid(id) || !isUuid(orgId)) return null;
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(trackerItems)
      .where(and(eq(trackerItems.id, id), eq(trackerItems.orgId, orgId)))
      .limit(1);
    return rows[0] ? toRow(rows[0] as RawRow) : null;
  },
  async insert(fields) {
    const db = getDb();
    const rows = await db.insert(trackerItems).values(fields).returning(COLUMNS);
    return toRow(rows[0]! as RawRow);
  },
  async update(id, patch) {
    const db = getDb();
    await db
      .update(trackerItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(trackerItems.id, id));
  },
};
