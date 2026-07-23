// Data access for a manager's people roster (people-roster Phase 1) — the storage
// seam, Postgres-backed. A person row is a manager's report; most never log in
// (user_id stays null until a member account is linked). Every read is fenced by
// org_id + manager_id — the repo never answers across that wall. The service depends
// on the interface, so it's unit-tested against an in-memory fake without a database.

import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { people, users, sessions, runArtifacts, invitations } from "../../../db/schema.ts";

/** One roster row as stored. */
export interface PersonRow {
  id: string;
  orgId: string;
  managerId: string;
  name: string;
  role: string | null;
  seniority: string | null;
  userId: string | null;
  mergedIntoId: string | null;
  archivedAt: Date | null;
  // The pre-seeded example person a fresh signup gets (demo-member phase 1).
  // Optional so older fakes/rows read as "not demo".
  isDemo?: boolean;
}

export interface PeopleRepo {
  /** Every row for this manager — merged/archived included; the service filters. */
  listForManager(orgId: string, managerId: string): Promise<PersonRow[]>;
  /** One row, fenced — null when the id isn't this manager's (or this org's). */
  findForManager(id: string, orgId: string, managerId: string): Promise<PersonRow | null>;
  insert(fields: {
    orgId: string;
    managerId: string;
    name: string;
    role?: string | null;
    seniority?: string | null;
    isDemo?: boolean;
  }): Promise<PersonRow>;
  update(
    id: string,
    patch: Partial<Pick<PersonRow, "name" | "role" | "seniority" | "userId" | "mergedIntoId" | "archivedAt">>,
  ): Promise<void>;
  /** Hard delete: permanently remove the person and everything about them — their 1:1
   *  runs + artifacts, any pending invite, and the roster row — in one transaction.
   *  Fencing (owned) is the service's job; this just does the cascade. */
  remove(id: string, orgId: string): Promise<void>;
  /** Roster rows linked to this member account, org-fenced (people-roster Phase 5). */
  findByLinkedUser(userId: string, orgId: string): Promise<PersonRow[]>;
  /** The org's ACTIVE login accounts, minimal fields — the link-picker options and the
   *  manager-name lookup. Never selects password_hash. */
  listOrgUsers(orgId: string): Promise<{ id: string; name: string; email: string }[]>;
  /** Pending invitations for THIS manager's roster people (team-page-redesign Phase 3) —
   *  so each card can show Invited / Opened, keyed by personId. Org + manager fenced. */
  listPendingInvitesForManager(
    orgId: string,
    managerId: string,
  ): Promise<{ personId: string; inviteId: string; invitedAt: Date; openedAt: Date | null }[]>;
}

// people.org_id / manager_id / user_id are uuid columns. A synthetic dev identity
// (DEV_AUTOLOGIN) carries non-uuid ids like "dev-org" / "dev-user"; comparing a uuid
// column to that literal throws "invalid input syntax for type uuid" — a 500 on every
// read. A non-uuid caller provably owns no uuid-keyed rows, so short-circuit to empty
// before touching the DB (same guard the people-aliases repo uses).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

const COLUMNS = {
  id: people.id,
  orgId: people.orgId,
  managerId: people.managerId,
  name: people.name,
  role: people.role,
  seniority: people.seniority,
  userId: people.userId,
  mergedIntoId: people.mergedIntoId,
  archivedAt: people.archivedAt,
  isDemo: people.isDemo,
};

export const pgPeopleRepo: PeopleRepo = {
  async listForManager(orgId, managerId) {
    if (!isUuid(orgId) || !isUuid(managerId)) return [];
    const db = getDb();
    return db
      .select(COLUMNS)
      .from(people)
      .where(and(eq(people.orgId, orgId), eq(people.managerId, managerId)));
  },
  async findForManager(id, orgId, managerId) {
    if (!isUuid(id) || !isUuid(orgId) || !isUuid(managerId)) return null;
    const db = getDb();
    const rows = await db
      .select(COLUMNS)
      .from(people)
      .where(and(eq(people.id, id), eq(people.orgId, orgId), eq(people.managerId, managerId)))
      .limit(1);
    return rows[0] ?? null;
  },
  async insert(fields) {
    const db = getDb();
    const rows = await db
      .insert(people)
      .values({
        orgId: fields.orgId,
        managerId: fields.managerId,
        name: fields.name,
        role: fields.role ?? null,
        seniority: fields.seniority ?? null,
        isDemo: fields.isDemo ?? false,
      })
      .returning(COLUMNS);
    return rows[0]!;
  },
  async update(id, patch) {
    const db = getDb();
    await db
      .update(people)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(people.id, id));
  },
  async remove(id, orgId) {
    if (!isUuid(id) || !isUuid(orgId)) return; // non-uuid caller owns no uuid-keyed rows
    const db = getDb();
    await db.transaction(async (tx) => {
      // 1. their 1:1 runs → artifacts first (no FK on run_artifacts), then the sessions.
      const runs = await tx
        .select({ key: sessions.sessionKey })
        .from(sessions)
        .where(and(eq(sessions.personId, id), eq(sessions.orgId, orgId)));
      const keys = runs.map((r) => r.key);
      if (keys.length) {
        await tx.delete(runArtifacts).where(inArray(runArtifacts.sessionKey, keys));
        await tx.delete(sessions).where(and(eq(sessions.personId, id), eq(sessions.orgId, orgId)));
      }
      // 2. pending invites carry a FK to people → clear before the person row.
      await tx.delete(invitations).where(eq(invitations.personId, id));
      // 3. any row merged INTO this person also FKs people.id → un-point so the delete is FK-safe.
      await tx.update(people).set({ mergedIntoId: null }).where(eq(people.mergedIntoId, id));
      // 4. the roster row itself.
      await tx.delete(people).where(eq(people.id, id));
    });
  },
  async findByLinkedUser(userId, orgId) {
    if (!isUuid(userId) || !isUuid(orgId)) return [];
    const db = getDb();
    return db
      .select(COLUMNS)
      .from(people)
      .where(and(eq(people.userId, userId), eq(people.orgId, orgId)));
  },
  async listOrgUsers(orgId) {
    if (!isUuid(orgId)) return [];
    const db = getDb();
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.orgId, orgId), isNull(users.deactivatedAt)));
  },
  async listPendingInvitesForManager(orgId, managerId) {
    if (!isUuid(orgId) || !isUuid(managerId)) return [];
    const db = getDb();
    const rows = await db
      .select({
        personId: invitations.personId,
        inviteId: invitations.id,
        invitedAt: invitations.createdAt,
        openedAt: invitations.openedAt,
      })
      .from(invitations)
      .innerJoin(people, eq(invitations.personId, people.id))
      .where(and(eq(people.orgId, orgId), eq(people.managerId, managerId), eq(invitations.status, "pending")));
    return rows.filter((r): r is { personId: string; inviteId: string; invitedAt: Date; openedAt: Date | null } => r.personId != null);
  },
};
