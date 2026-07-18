// Data access for auth (Phase 006 Phase 2). The service depends only on this
// interface, so the in-memory fake in the test proves the logic is storage-agnostic
// — same seam pattern as the other domains. Postgres is the only real backing here
// (auth needs a database; there is no file fallback).
//
// Scope this phase: look a user up by email, create a user, and resolve an org to
// attach new users to. ensureDefaultOrg is a Phase-2 stand-in — Phase 4 replaces it
// with "register creates the company". Reading/writing auth_sessions is Phase 3.

import { and, eq, isNotNull, lt, ne, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "../../../db/client.ts";
import { users, organizations, authSessions, passwordResetTokens } from "../../../db/schema.ts";

/** Session tokens are stored HASHED at rest (audit F9) — the cookie carries the raw
 *  token, only its sha256 is ever written to or queried in the DB, so a database dump
 *  can't yield usable logins. Same rule the reset + invite tokens already follow. */
const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

/** A user as auth reads it — includes the password hash (login needs it); the
 *  service strips it before anything leaves the server (see PublicUser). */
export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string | null;
  /** Deactivate/reactivate (user-management Phase 3): a set timestamp blocks login.
   *  Optional so register's return path (a brand-new, active user) stays untouched. */
  deactivatedAt?: Date | null;
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
  /** The user with this id, or null — for a signed-in caller changing their own password
   *  (audit M12), where we already know who they are from the session, not an email. */
  findById(id: string): Promise<AuthUser | null>;
  /** Overwrite one user's password hash (change-password, M12). Only ever a hash. */
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
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
    return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash, deactivatedAt: u.deactivatedAt };
  },
  async findById(id) {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const u = rows[0];
    if (!u) return null;
    return { id: u.id, orgId: u.orgId, email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash, deactivatedAt: u.deactivatedAt };
  },
  async updatePasswordHash(id, passwordHash) {
    const db = getDb();
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
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
  /** Remove every session for a user EXCEPT the one carrying keepToken (audit F4) —
   *  a password change evicts other devices but not the one making the change. */
  deleteOthersForUser(userId: string, keepToken: string): Promise<void>;
  /** Remove ALL of a user's sessions (audit F4) — the reset ("I'm compromised") path. */
  deleteAllForUser(userId: string): Promise<void>;
  /** Delete rows past their expiry (audit F13) — a periodic sweep so dead (and hashed)
   *  session rows don't accumulate forever. */
  deleteExpired(): Promise<void>;
}

export const pgAuthSessionRepo: AuthSessionRepo = {
  async create(input) {
    const db = getDb();
    await db.insert(authSessions).values({
      token: sha256(input.token),
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
      .where(eq(authSessions.token, sha256(token)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    if (r.expiresAt.getTime() <= Date.now()) return null; // expired — treat as no session
    return { userId: r.userId, orgId: r.orgId, roles: [r.role], email: r.email, name: r.name };
  },
  async delete(token) {
    const db = getDb();
    await db.delete(authSessions).where(eq(authSessions.token, sha256(token)));
  },
  async deleteOthersForUser(userId, keepToken) {
    const db = getDb();
    await db
      .delete(authSessions)
      .where(and(eq(authSessions.userId, userId), ne(authSessions.token, sha256(keepToken))));
  },
  async deleteAllForUser(userId) {
    const db = getDb();
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
  },
  async deleteExpired() {
    const db = getDb();
    await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  },
};

// --- Password reset (forgot-password) — the password_reset_tokens store plus the two
// user touches a reset needs (look a user up by email, overwrite their password hash).
// Kept as its own interface, like AuthSessionRepo above, so register/login's AuthRepo
// (and its test fake) stay untouched. The raw token never reaches this layer: the
// service hashes it (sha256) and only the hash is stored or queried.

/** A user as the reset flow reads them — just what requestPasswordReset needs to decide
 *  whether to mint a token (no hash: reset never verifies an old password). */
export interface ResetUser {
  id: string;
  email: string;
  deactivatedAt: Date | null;
}

/** One reset token row as the service sees it. */
export interface ResetTokenRow {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface PasswordResetRepo {
  /** The user with this (already-normalized) email, or null. */
  findUserByEmail(email: string): Promise<ResetUser | null>;
  /** Persist a new reset token (only its sha256 hash). */
  createResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  /** The reset row behind a token hash, or null when unknown. Expiry/used are the
   *  service's to judge, so it can give the same "invalid link" message for both. */
  findByTokenHash(tokenHash: string): Promise<ResetTokenRow | null>;
  /** Burn a token so it can't be reused. */
  markUsed(id: string): Promise<void>;
  /** Overwrite a user's password hash (the actual reset). */
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  /** Delete used or expired reset rows (audit F13) — periodic cleanup. */
  deleteExpired(): Promise<void>;
}

export const pgPasswordResetRepo: PasswordResetRepo = {
  async findUserByEmail(email) {
    const db = getDb();
    const rows = await db
      .select({ id: users.id, email: users.email, deactivatedAt: users.deactivatedAt })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const u = rows[0];
    return u ? { id: u.id, email: u.email, deactivatedAt: u.deactivatedAt } : null;
  },
  async createResetToken(input) {
    const db = getDb();
    await db.insert(passwordResetTokens).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
  },
  async findByTokenHash(tokenHash) {
    const db = getDb();
    const rows = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ?? null;
  },
  async markUsed(id) {
    const db = getDb();
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  },
  async updatePasswordHash(userId, passwordHash) {
    const db = getDb();
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  },
  async deleteExpired() {
    const db = getDb();
    await db
      .delete(passwordResetTokens)
      .where(or(isNotNull(passwordResetTokens.usedAt), lt(passwordResetTokens.expiresAt, new Date())));
  },
};
