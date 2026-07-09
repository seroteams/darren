// Read-only data access for the superadmin view (pre-go-live PG6). This module is
// read-only BY CONSTRUCTION: it exposes only SELECT reads and imports no writer/deleter
// (never insert/update/delete). It reads the real `organizations` / `users` tables
// (populated by signup) across ALL companies — the one intentional cross-tenant read,
// reachable only behind requireSuperadminRoute. The per-company fence for every other
// path is untouched.
//
// The service depends on this interface, so its logic (grouping, ordering, the view
// shape) is proven against an in-memory fake without a database — same seam as auth.

import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../../../db/client.ts";
import { organizations, users, authSessions } from "../../../db/schema.ts";
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
 *  is the cross-company run read — reachable only behind requireSuperadminRoute. */
export interface RunRow {
  userId: string | null;
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
};
