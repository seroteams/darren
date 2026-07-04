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
import { users, organizations, authSessions } from "../../../db/schema.ts";

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

/** What register hands the repo to create a company and its first user together.
 *  The raw password never appears here — only the one-way hash. */
export interface NewOrgOwner {
  company: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface AuthRepo {
  /** The user with this (already-normalized) email, or null. */
  findByEmail(email: string): Promise<AuthUser | null>;
  /** Create the company AND its owner together, in one transaction (both succeed or
   *  neither does); returns the stored owner. This is what makes signup create the
   *  company (Phase 4). */
  createOrgWithOwner(input: NewOrgOwner): Promise<AuthUser>;
}

export const pgAuthRepo: AuthRepo = {
  async findByEmail(email) {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const u = rows[0];
    if (!u) return null;
    return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash };
  },
  async createOrgWithOwner(input) {
    const db = getDb();
    // One transaction: the org and its owner are created together, or not at all —
    // never a company with no owner, or an owner with no company.
    return db.transaction(async (tx) => {
      const orgRows = await tx.insert(organizations).values({ name: input.company }).returning();
      const org = orgRows[0];
      if (!org) throw new Error("createOrgWithOwner: org insert returned no row");
      const userRows = await tx
        .insert(users)
        .values({
          orgId: org.id,
          email: input.email,
          name: input.name,
          role: "manager",
          passwordHash: input.passwordHash,
        })
        .returning();
      const u = userRows[0];
      if (!u) throw new Error("createOrgWithOwner: user insert returned no row");
      return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash };
    });
  },
};

// --- Login sessions (Phase 3) — the auth_sessions store. Kept as its own interface
// so the register/login service's AuthRepo (and its test fake) stay untouched: the
// controller manages sessions after the service authenticates.

/** Who a valid session belongs to — what buildIdentity needs. */
export interface SessionIdentity {
  userId: string;
  orgId: string;
  roles: string[];
  email: string;
  name: string;
}

/** A new login session to persist (the cookie carries `token`). */
export interface NewSession {
  token: string;
  userId: string;
  orgId: string;
  expiresAt: Date;
}

export interface AuthSessionRepo {
  /** Persist a new login session. */
  create(input: NewSession): Promise<void>;
  /** The identity behind a session token, or null when unknown or expired. */
  findIdentityByToken(token: string): Promise<SessionIdentity | null>;
  /** Remove a session (logout). */
  delete(token: string): Promise<void>;
}

export const pgAuthSessionRepo: AuthSessionRepo = {
  async create(input) {
    const db = getDb();
    await db.insert(authSessions).values({
      token: input.token,
      userId: input.userId,
      orgId: input.orgId,
      expiresAt: input.expiresAt,
    });
  },
  async findIdentityByToken(token) {
    const db = getDb();
    const rows = await db
      .select({
        userId: authSessions.userId,
        orgId: authSessions.orgId,
        role: users.role,
        email: users.email,
        name: users.name,
        expiresAt: authSessions.expiresAt,
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(eq(authSessions.token, token))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    if (r.expiresAt.getTime() <= Date.now()) return null; // expired — treat as no session
    return { userId: r.userId, orgId: r.orgId, roles: [r.role], email: r.email, name: r.name };
  },
  async delete(token) {
    const db = getDb();
    await db.delete(authSessions).where(eq(authSessions.token, token));
  },
};
