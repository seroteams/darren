// Auth logic (Phase 006 Phase 2): register and login. Pure — it never touches
// req/res or storage directly. The repo (storage) and the hasher (password
// scrambling) are both injected, so the service is fully testable with fakes and
// the real bcrypt is wired only at the controller edge.
//
// The raw password lives only as a local string for the length of a call: register
// hands the repo a one-way hash, login compares against that hash. It is never
// stored, logged, or returned.

import { createHash, randomBytes } from "node:crypto";
import type { AuthRepo, AuthUser, PasswordResetRepo } from "./auth.repo.ts";
import { badRequest, conflict, unauthenticated, forbidden, notFound } from "../../middleware/http-error.ts";

/** Shortest password we accept. Plain minimum-length gate — strength rules are not
 *  in this phase. */
const MIN_PASSWORD_LENGTH = 8;

/** The password-scrambling port. bcrypt at the controller edge; a fake in tests. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  company?: string; // the new company's name; defaults to "<name>'s Company"
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/** The safe user shape that leaves the server — no password hash, ever. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
}

export interface AuthService {
  register(input: RegisterInput): Promise<PublicUser>;
  login(input: LoginInput): Promise<PublicUser>;
  changePassword(input: ChangePasswordInput): Promise<void>;
}

function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

function toPublic(u: AuthUser): PublicUser {
  return { id: u.id, email: u.email, name: u.name, orgId: u.orgId, role: u.role };
}

export function createAuthService(repo: AuthRepo, hasher: PasswordHasher): AuthService {
  return {
    async register(input) {
      const email = normalizeEmail(input.email);
      const name = (input.name ?? "").trim();
      const password = input.password ?? "";

      if (!email) throw badRequest("Email is required.");
      if (!name) throw badRequest("Name is required.");
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      if (await repo.findByEmail(email)) {
        throw conflict("That email is already registered.");
      }

      // Because it's HR, signing up creates the company too: the first person becomes
      // its owner (Phase 4). Default the company name from the person's name.
      const company = (input.company ?? "").trim() || `${name}'s Company`;
      const passwordHash = await hasher.hash(password);
      const user = await repo.createOrgWithOwner({ company, email, name, passwordHash });
      return toPublic(user);
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const password = input.password ?? "";
      const user = email ? await repo.findByEmail(email) : null;

      // One message whether the email is unknown or the password is wrong — we don't
      // reveal which emails have accounts. Still honest: a wrong password is never
      // let in.
      if (!user || !user.passwordHash || !(await hasher.verify(password, user.passwordHash))) {
        throw unauthenticated("Email or password is incorrect.");
      }
      // A deactivated account is refused even with the right password (user-management
      // Phase 3). They authenticated, so it's honest to say why rather than "wrong password".
      if (user.deactivatedAt) {
        throw forbidden("This account has been deactivated. Contact your administrator.");
      }
      return toPublic(user);
    },

    async changePassword(input) {
      // The signed-in manager changing their OWN password (audit M12). We know who they are
      // from the session, so we look them up by id — never by an email the body supplies.
      const newPassword = input.newPassword ?? "";
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      const user = await repo.findById(input.userId);
      // A missing user or a wrong current password give the same "current password is
      // incorrect" — a re-auth gate, so we never confirm the new value was written unless
      // the old one genuinely matched. Nothing is stored on either failure.
      if (!user || !user.passwordHash || !(await hasher.verify(input.currentPassword ?? "", user.passwordHash))) {
        throw unauthenticated("Your current password is incorrect.");
      }
      await repo.updatePasswordHash(user.id, await hasher.hash(newPassword));
    },
  };
}

// --- Password reset (forgot-password) ------------------------------------------------
// A separate service (its own repo + no relation to register/login's AuthRepo), so the
// register/login test fake stays untouched. The emailed link carries an opaque token;
// only its sha256 hash is ever stored (mirrors the invitations flow). Token rules:
// single-use, 1-hour expiry, and the SAME "invalid link" answer for unknown / used /
// expired — a reset link is either live or it isn't, we don't explain which.

/** How long a reset link is good for (1 hour) — short on purpose. */
const RESET_TTL_MS = 60 * 60 * 1000;
const RESET_INVALID = "That reset link isn't valid anymore — request a new one.";

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

/** What requestPasswordReset hands back when it mints a link. `token` is the RAW token —
 *  it exists only here and in the email; storage only ever sees its hash. */
export interface PasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetService {
  /** Mint + store a reset token for a known, active account. Returns null for an unknown
   *  or deactivated email (the controller still answers with the same generic 200, so
   *  neither case leaks whether an account exists). */
  requestPasswordReset(email: string): Promise<PasswordResetRequest | null>;
  /** Redeem a token: validate it, set the new password, burn the token. Throws a
   *  plain-words error for an invalid link or a too-short password. */
  resetPassword(token: string, newPassword: string): Promise<void>;
}

export function createPasswordResetService(repo: PasswordResetRepo, hasher: PasswordHasher): PasswordResetService {
  return {
    async requestPasswordReset(emailRaw) {
      const email = normalizeEmail(emailRaw);
      if (!email) return null;
      const user = await repo.findUserByEmail(email);
      if (!user || user.deactivatedAt) return null; // unknown or switched off — silent no-op
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_TTL_MS);
      await repo.createResetToken({ userId: user.id, tokenHash: sha256(token), expiresAt });
      return { email: user.email, token, expiresAt };
    },

    async resetPassword(token, newPassword) {
      const raw = token ?? "";
      const password = newPassword ?? "";
      const row = raw ? await repo.findByTokenHash(sha256(raw)) : null;
      // Unknown, already-used, or expired all read the same — the link just isn't live.
      if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) throw notFound(RESET_INVALID);
      // Validate the password AFTER the token, and BEFORE burning it: a too-short try
      // leaves the link usable so they can pick a longer one.
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      await repo.updatePasswordHash(row.userId, await hasher.hash(password));
      await repo.markUsed(row.id);
    },
  };
}
