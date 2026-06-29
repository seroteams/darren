// Data access for auth (Phase 006 Phase 2). The service depends only on this
// interface, so the in-memory fake in the test proves the logic is storage-agnostic
// — same seam pattern as the other domains. Postgres is the only real backing here
// (auth needs a database; there is no file fallback).
//
// Scope this phase: look a user up by email, create a user, and resolve an org to
// attach new users to. ensureDefaultOrg is a Phase-2 stand-in — Phase 4 replaces it
// with "register creates the company". Reading/writing auth_sessions is Phase 3.

import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { users, organizations } from "../../../db/schema.ts";

/** A user as auth reads it — includes the password hash (login needs it); the
 *  service strips it before anything leaves the server (see PublicUser). */
export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string | null;
}

/** What register hands the repo to persist. The raw password never appears here —
 *  only the one-way hash. */
export interface NewUser {
  orgId: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface AuthRepo {
  /** The user with this (already-normalized) email, or null. */
  findByEmail(email: string): Promise<AuthUser | null>;
  /** Persist a new user; returns the stored row. */
  createUser(input: NewUser): Promise<AuthUser>;
  /** The org id new users attach to until Phase 4 — created once, then reused. */
  ensureDefaultOrg(): Promise<string>;
}

// The shared placeholder org every Phase-2 signup joins. Phase 4 removes this in
// favour of register creating the signer's own company.
const DEFAULT_ORG_NAME = "Default Org (pre-Phase-4)";

export const pgAuthRepo: AuthRepo = {
  async findByEmail(email) {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const u = rows[0];
    if (!u) return null;
    return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash };
  },
  async createUser(input) {
    const db = getDb();
    const rows = await db
      .insert(users)
      .values({ orgId: input.orgId, email: input.email, name: input.name, passwordHash: input.passwordHash })
      .returning();
    const u = rows[0];
    if (!u) throw new Error("createUser: insert returned no row");
    return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash };
  },
  async ensureDefaultOrg() {
    const db = getDb();
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, DEFAULT_ORG_NAME))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const rows = await db.insert(organizations).values({ name: DEFAULT_ORG_NAME }).returning();
    const org = rows[0];
    if (!org) throw new Error("ensureDefaultOrg: insert returned no row");
    return org.id;
  },
};
