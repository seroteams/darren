// Read-only data access for the superadmin view (pre-go-live PG6). This module is
// read-only BY CONSTRUCTION: it exposes only SELECT reads and imports no writer/deleter
// (never insert/update/delete). It reads the real `organizations` / `users` tables
// (populated by signup) across ALL companies — the one intentional cross-tenant read,
// reachable only behind requireSuperadminRoute. The per-company fence for every other
// path is untouched.
//
// The service depends on this interface, so its logic (grouping, ordering, the view
// shape) is proven against an in-memory fake without a database — same seam as auth.

import { getDb } from "../../../db/client.ts";
import { organizations, users } from "../../../db/schema.ts";

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
}

export interface SuperadminRepo {
  listOrganizations(): Promise<OrgRow[]>;
  listUsers(): Promise<UserRow[]>;
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
      })
      .from(users);
  },
};
