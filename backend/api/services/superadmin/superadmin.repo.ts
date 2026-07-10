// Read-only data access for the superadmin view (pre-go-live PG6). This module is
// read-only BY CONSTRUCTION: it exposes only SELECT reads and imports no writer/deleter
// (never insert/update/delete). It reads the real `organizations` / `users` tables
// (populated by signup) across ALL companies — the one intentional cross-tenant read,
// reachable only behind requireSuperadminRoute. The per-company fence for every other
// path is untouched.
//
// The service depends on this interface, so its logic (grouping, ordering, the view
// shape) is proven against an in-memory fake without a database — same seam as auth.

import { eq, sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../../../db/client.ts";
import {
  organizations,
  users,
  authSessions,
  people,
  peopleAliases,
  invitations,
  feedbackNotes,
  errorLogs,
  auditLog,
  sessions,
} from "../../../db/schema.ts";
import { listRunsForSuperadmin, listFinishedRunsForUser, listOwnerlessFinishedRuns, superadminRunView } from "../../../engine/run-history.ts";
import { pgListRunsForSuperadmin, pgListFinishedRunsForUser, pgListGuestRuns, pgSuperadminRunView } from "../../../db/runs-store.ts";

/** The account roles, mirrored from the `user_role` enum in schema.ts. */
export type UserRoleName = "admin" | "manager" | "member";

/** One company row (no tenant scope — this is the cross-company read). */
export interface OrgRow {
  id: string;
  name: string;
  createdAt: Date;
}

/** One user row. `passwordHash` is deliberately NOT selected — no secret ever enters
 *  this path. `orgId` is here only so the service can nest users under their company;
 *  it's dropped from the outward-facing view. */
export interface UserRow {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  /** Deactivate/reactivate (Phase 3): a set timestamp = switched off; absent/null = active.
   *  Optional so the many read-only view constructions stay untouched — undefined means active. */
  deactivatedAt?: Date | null;
}

/** One finished run, attributed to its owner (pre-go-live PG7). `userId` may be null for
 *  machine/gate sessions (the service ignores those). `stars` is null when unrated. This
 *  is the cross-company run read — reachable only behind requireSuperadminRoute.
 *  `createdAt` (validation-kit Phase 2) is when the run STARTED — the return signal's
 *  clock; optional because legacy rows may predate it (the service falls back to lastSeenAt). */
export interface RunRow {
  userId: string | null;
  createdAt?: number;
  lastSeenAt: number;
  stars: number | null;
}

/** One of a user's finished 1:1s for the drilldown (pre-go-live PG8) — the member-safe row
 *  shape (headline, ctx, rating), reused from the run walk. No briefing here (that's the
 *  read-only detail, opened separately). */
export interface UserRunRow {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
}

/** One finished run's read-only briefing + context (superadmin drilldown detail, PG8 Step 3).
 *  Same shape memberRunView returns, but read unfenced behind the superadmin route. */
export interface SuperadminRunDetail {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  briefing: unknown;
  lastSeenAt: number;
  completedAt: number | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
}

export interface SuperadminRepo {
  listOrganizations(): Promise<OrgRow[]>;
  listUsers(): Promise<UserRow[]>;
  listRuns(): Promise<RunRow[]>;
  /** One user's finished runs, across all companies (superadmin drilldown, PG8). */
  listRunsForUser(userId: string): Promise<UserRunRow[]>;
  /** Every OWNERLESS finished run — the unclaimed guest pile (guest-run Phase 4).
   *  Ownerless = no userId AND no orgId; a claimed run leaves this list. */
  listGuestRuns(): Promise<UserRunRow[]>;
  /** One finished run's read-only detail, unfenced (PG8 Step 3). null if unknown/unfinished. */
  readRun(id: string): Promise<SuperadminRunDetail | null>;
  /** Set a user's account role (user-management Phase 2). The ONE guarded write on this
   *  path — validation + the "never orphan a company" guardrail run in the service first. */
  updateUserRole(userId: string, role: UserRoleName): Promise<void>;
  /** Switch a user off (a timestamp) or back on (null) — user-management Phase 3. The
   *  guardrails (no self / no superadmin / no org's last active lead) run in the service first. */
  setDeactivated(userId: string, at: Date | null): Promise<void>;
  /** Drop every live login session for a user — so a deactivation kicks them NOW, not just
   *  at their next login. Called right after setDeactivated on the deactivate path. */
  revokeSessionsForUser(userId: string): Promise<void>;
  /** How many roster people this user MANAGES (people.manager_id). The service refuses to
   *  delete a user while this is > 0 — that link is NOT NULL, so a delete would wipe the team. */
  managedRosterCount(userId: string): Promise<number>;
  /** Permanently delete a user (user-management Phase 4). Keeps their finished runs under the
   *  company but ORPHANS them (owner cleared in both the indexed column and the authoritative
   *  state), and clears every other reference so no foreign key blocks the delete. One
   *  transaction — all-or-nothing. The guardrails run in the service first. */
  deleteUser(userId: string): Promise<void>;
}

export const pgSuperadminRepo: SuperadminRepo = {
  async listOrganizations() {
    const db = getDb();
    return db
      .select({ id: organizations.id, name: organizations.name, createdAt: organizations.createdAt })
      .from(organizations);
  },
  async listUsers() {
    const db = getDb();
    // Explicit columns only — password_hash is never selected. The service orders/groups.
    return db
      .select({
        id: users.id,
        orgId: users.orgId,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        deactivatedAt: users.deactivatedAt,
      })
      .from(users);
  },
  // Read cutover (postgres-runtime-data Phase 3): runs come from the sessions
  // table when a database is configured; the file walk stays the DB-less mode.
  // Both are the unfenced cross-tenant read, reachable only behind the
  // superadmin route.
  async listRuns() {
    return hasDatabaseUrl() ? pgListRunsForSuperadmin() : listRunsForSuperadmin();
  },
  async listRunsForUser(userId: string) {
    return hasDatabaseUrl() ? pgListFinishedRunsForUser(userId) : listFinishedRunsForUser(userId);
  },
  async listGuestRuns() {
    return hasDatabaseUrl() ? pgListGuestRuns() : listOwnerlessFinishedRuns();
  },
  async readRun(id: string) {
    return hasDatabaseUrl() ? pgSuperadminRunView(id) : superadminRunView(id);
  },
  async updateUserRole(userId: string, role: UserRoleName) {
    const db = getDb();
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  },
  async setDeactivated(userId: string, at: Date | null) {
    const db = getDb();
    await db.update(users).set({ deactivatedAt: at, updatedAt: new Date() }).where(eq(users.id, userId));
  },
  async revokeSessionsForUser(userId: string) {
    const db = getDb();
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
  },
  async managedRosterCount(userId: string) {
    const db = getDb();
    // People this user manages that are still live (not merged away). A merged row is a
    // resolved pointer, not an active roster member, so it doesn't block the delete.
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(people)
      .where(sql`${people.managerId} = ${userId} and ${people.mergedIntoId} is null`);
    return row?.n ?? 0;
  },
  async deleteUser(userId: string) {
    const db = getDb();
    // One transaction: orphan the runs, clear every reference, then remove the user.
    // If any step fails the whole thing rolls back — a half-deleted user is never left.
    await db.transaction(async (tx) => {
      // Runs stay under the company but lose their owner — in BOTH the indexed column and
      // the authoritative `state` jsonb the privacy fence reads (so no ghost owner id lingers).
      await tx
        .update(sessions)
        .set({ userId: null, state: sql`jsonb_set(${sessions.state}, '{userId}', 'null'::jsonb)` })
        .where(eq(sessions.userId, userId));
      // NOT NULL references to this user must be removed, not nulled.
      await tx.delete(authSessions).where(eq(authSessions.userId, userId));
      await tx.delete(peopleAliases).where(eq(peopleAliases.userId, userId));
      // Nullable references: unlink, keeping the surrounding rows (roster entry, invite,
      // feedback, error, audit line all survive without the account).
      await tx.update(people).set({ userId: null }).where(eq(people.userId, userId));
      await tx.update(invitations).set({ invitedBy: null }).where(eq(invitations.invitedBy, userId));
      await tx.update(feedbackNotes).set({ userId: null }).where(eq(feedbackNotes.userId, userId));
      await tx.update(errorLogs).set({ userId: null }).where(eq(errorLogs.userId, userId));
      await tx.update(auditLog).set({ actorUserId: null }).where(eq(auditLog.actorUserId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  },
};
