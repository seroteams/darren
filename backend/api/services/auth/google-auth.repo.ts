// Data access for Google sign-in (google-signin Phase 1) — the storage seam the
// pure service depends on. Queries users + invitations directly (drizzle), reusing
// the same shapes and transaction discipline as auth.repo.ts / invites.repo.ts.
// The service is unit-tested against an in-memory fake; this file is the only
// Postgres binding.

import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { invitations, organizations, people, users } from "../../../db/schema.ts";
import type { GoogleAuthRepo, GoogleUser } from "./google-auth.service.ts";

type UserRow = typeof users.$inferSelect;

function toGoogleUser(u: UserRow): GoogleUser {
  return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, deactivatedAt: u.deactivatedAt };
}

export const pgGoogleAuthRepo: GoogleAuthRepo = {
  async findBySub(sub) {
    const rows = await getDb().select().from(users).where(eq(users.googleSub, sub)).limit(1);
    return rows[0] ? toGoogleUser(rows[0]) : null;
  },

  async findByEmail(email) {
    const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ? toGoogleUser(rows[0]) : null;
  },

  async linkSub(userId, sub) {
    await getDb().update(users).set({ googleSub: sub, updatedAt: new Date() }).where(eq(users.id, userId));
  },

  async findPendingInviteByEmail(email) {
    // Newest pending, unexpired invite wins — matches what the /join link would do.
    const rows = await getDb()
      .select({
        id: invitations.id,
        orgId: invitations.orgId,
        role: invitations.role,
        personId: invitations.personId,
      })
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, "pending"), gt(invitations.expiresAt, new Date())))
      .orderBy(desc(invitations.createdAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async acceptInviteWithGoogle(input) {
    const db = getDb();
    // One transaction, mirroring invites.service accept: the member user, the roster
    // link and the burned invite land together or not at all.
    return db.transaction(async (tx) => {
      const userRows = await tx
        .insert(users)
        .values({
          orgId: input.orgId,
          email: input.email,
          name: input.name,
          role: input.role as "admin" | "manager" | "member",
          passwordHash: null,
          googleSub: input.sub,
        })
        .returning();
      const u = userRows[0];
      if (!u) throw new Error("acceptInviteWithGoogle: user insert returned no row");
      if (input.personId) {
        await tx.update(people).set({ userId: u.id, updatedAt: new Date() }).where(eq(people.id, input.personId));
      }
      await tx.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, input.inviteId));
      return toGoogleUser(u);
    });
  },

  async createOrgWithGoogleOwner(input) {
    const db = getDb();
    // One transaction, mirroring createOrgWithOwner (auth.repo.ts): never a company
    // with no owner, or an owner with no company.
    return db.transaction(async (tx) => {
      const orgRows = await tx.insert(organizations).values({ name: input.company }).returning();
      const org = orgRows[0];
      if (!org) throw new Error("createOrgWithGoogleOwner: org insert returned no row");
      const userRows = await tx
        .insert(users)
        .values({
          orgId: org.id,
          email: input.email,
          name: input.name,
          role: "manager",
          passwordHash: null,
          googleSub: input.sub,
        })
        .returning();
      const u = userRows[0];
      if (!u) throw new Error("createOrgWithGoogleOwner: user insert returned no row");
      return toGoogleUser(u);
    });
  },
};
