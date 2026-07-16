// Data access for the join flow (member-onboarding-invites) — the storage seam over the
// invitations table plus the few adjacent lookups accepting an invite needs (users,
// organizations, people). The one-time token itself NEVER reaches this layer: the service
// hashes it (sha256) and only the hash is stored or queried. The service depends on the
// interface, so it's unit-tested against an in-memory fake without a database.

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { invitations, organizations, people, users } from "../../../db/schema.ts";

/** One invitation as the service sees it. */
export interface InviteRow {
  id: string;
  orgId: string;
  email: string;
  role: string;
  status: string;
  invitedBy: string | null;
  expiresAt: Date;
  tokenHash: string;
  personId: string | null;
  openedAt: Date | null;
}

export interface NewInvite {
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: Date;
  tokenHash: string;
  // Omitted for a workspace-level invite (members-page) — the join isn't tied to a roster
  // person. Present for a roster invite, so accepting auto-links people.user_id.
  personId?: string;
}

export interface InvitesRepo {
  /** The inviter's own roster row, fenced — null when it isn't theirs. */
  findPersonForManager(id: string, orgId: string, managerId: string): Promise<{ id: string; name: string; userId: string | null } | null>;
  insertInvite(row: NewInvite): Promise<{ id: string }>;
  findByTokenHash(hash: string): Promise<InviteRow | null>;
  markAccepted(id: string): Promise<void>;
  /** Stamp opened_at the first time the join link is opened (only if still null). */
  markOpened(id: string): Promise<void>;
  /** A pending invite by id, fenced to the org (members-page Phase 4) — null otherwise. */
  findPendingInviteForOrg(id: string, orgId: string): Promise<InviteRow | null>;
  /** Re-point an invite at a fresh token + expiry (resend) — the old hash stops matching. */
  updateInviteToken(id: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Flip an invite's status (e.g. → revoked). */
  setInviteStatus(id: string, status: string): Promise<void>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  createMemberUser(input: { orgId: string; email: string; name: string; passwordHash: string; role: string }): Promise<{ id: string; orgId: string; email: string; name: string; role: string }>;
  linkPersonUser(personId: string, userId: string): Promise<void>;
  orgName(orgId: string): Promise<string>;
  userName(userId: string): Promise<string | null>;
  personName(personId: string): Promise<string | null>;
}

export const pgInvitesRepo: InvitesRepo = {
  async findPersonForManager(id, orgId, managerId) {
    const rows = await getDb()
      .select({ id: people.id, name: people.name, userId: people.userId })
      .from(people)
      .where(and(eq(people.id, id), eq(people.orgId, orgId), eq(people.managerId, managerId)))
      .limit(1);
    return rows[0] ?? null;
  },
  async insertInvite(row) {
    const rows = await getDb()
      .insert(invitations)
      .values({ ...row, role: row.role as "admin" | "manager" | "member" })
      .returning({ id: invitations.id });
    return rows[0]!;
  },
  async findByTokenHash(hash) {
    const rows = await getDb()
      .select({
        id: invitations.id,
        orgId: invitations.orgId,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        invitedBy: invitations.invitedBy,
        expiresAt: invitations.expiresAt,
        tokenHash: invitations.tokenHash,
        personId: invitations.personId,
        openedAt: invitations.openedAt,
      })
      .from(invitations)
      .where(eq(invitations.tokenHash, hash))
      .limit(1);
    const r = rows[0];
    if (!r || !r.expiresAt || !r.tokenHash) return null;
    return { ...r, expiresAt: r.expiresAt, tokenHash: r.tokenHash };
  },
  async markAccepted(id) {
    await getDb().update(invitations).set({ status: "accepted" }).where(eq(invitations.id, id));
  },
  async markOpened(id) {
    // Only the FIRST open counts — don't overwrite an earlier timestamp on a re-open.
    await getDb().update(invitations).set({ openedAt: new Date() }).where(and(eq(invitations.id, id), isNull(invitations.openedAt)));
  },
  async findPendingInviteForOrg(id, orgId) {
    const rows = await getDb()
      .select({
        id: invitations.id,
        orgId: invitations.orgId,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        invitedBy: invitations.invitedBy,
        expiresAt: invitations.expiresAt,
        tokenHash: invitations.tokenHash,
        personId: invitations.personId,
        openedAt: invitations.openedAt,
      })
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.orgId, orgId), eq(invitations.status, "pending")))
      .limit(1);
    const r = rows[0];
    if (!r || !r.expiresAt || !r.tokenHash) return null;
    return { ...r, expiresAt: r.expiresAt, tokenHash: r.tokenHash };
  },
  async updateInviteToken(id, tokenHash, expiresAt) {
    await getDb().update(invitations).set({ tokenHash, expiresAt }).where(eq(invitations.id, id));
  },
  async setInviteStatus(id, status) {
    await getDb().update(invitations).set({ status: status as "pending" | "accepted" | "revoked" }).where(eq(invitations.id, id));
  },
  async findUserByEmail(email) {
    const rows = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  },
  async createMemberUser(input) {
    const rows = await getDb()
      .insert(users)
      .values({ orgId: input.orgId, email: input.email, name: input.name, role: input.role as "admin" | "manager" | "member", passwordHash: input.passwordHash })
      .returning({ id: users.id, orgId: users.orgId, email: users.email, name: users.name, role: users.role });
    return rows[0]!;
  },
  async linkPersonUser(personId, userId) {
    await getDb().update(people).set({ userId, updatedAt: new Date() }).where(eq(people.id, personId));
  },
  async orgName(orgId) {
    const rows = await getDb().select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return rows[0]?.name ?? "your company";
  },
  async userName(userId) {
    const rows = await getDb().select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    return rows[0]?.name ?? null;
  },
  async personName(personId) {
    const rows = await getDb().select({ name: people.name }).from(people).where(eq(people.id, personId)).limit(1);
    return rows[0]?.name ?? null;
  },
};
