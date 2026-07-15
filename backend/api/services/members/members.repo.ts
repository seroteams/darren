// Data access for the org Members page (members-page Phase 1) — the storage seam over the
// two tables that make up "who can log in to this workspace": `users` (login accounts) and
// `invitations` (pending, not-yet-accepted). Every read is fenced by org_id — the repo never
// answers across that wall. The service depends on the interface, so it's unit-tested against
// an in-memory fake without a database. Distinct from the superadmin console (cross-company,
// read-only): this is a normal admin's view of their OWN org.

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { users, invitations } from "../../../db/schema.ts";

/** One login account in the org (active or deactivated). Never selects password_hash. */
export interface OrgUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  deactivatedAt: Date | null;
  createdAt: Date;
}

/** One pending invite — an email that hasn't accepted yet. */
export interface PendingInviteRow {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface MembersRepo {
  /** Every login account in the org — active AND deactivated (the page tags each). */
  listOrgUsers(orgId: string): Promise<OrgUserRow[]>;
  /** Invites still awaiting acceptance (status = pending) in the org. */
  listPendingInvites(orgId: string): Promise<PendingInviteRow[]>;
}

// org_id is a uuid column; a synthetic dev identity (DEV_AUTOLOGIN) carries a non-uuid id
// like "dev-org". Comparing a uuid column to that literal throws in Postgres — a 500 on
// every read. A non-uuid caller provably owns no uuid-keyed rows, so short-circuit to empty
// (same guard people.repo uses).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

export const pgMembersRepo: MembersRepo = {
  async listOrgUsers(orgId) {
    if (!isUuid(orgId)) return [];
    return getDb()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        deactivatedAt: users.deactivatedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.orgId, orgId));
  },
  async listPendingInvites(orgId) {
    if (!isUuid(orgId)) return [];
    return getDb()
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(and(eq(invitations.orgId, orgId), eq(invitations.status, "pending")));
  },
};
