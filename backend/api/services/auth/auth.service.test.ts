import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { createAuthService, createPasswordResetService } from "./auth.service.ts";
import type { PasswordHasher } from "./auth.service.ts";
import type { AuthRepo, AuthUser, NewOrgOwner, PasswordResetRepo, ResetUser } from "./auth.repo.ts";

// In-memory repo: proves the service logic never depends on Postgres (the seam
// check). Captures exactly what register persists — the stored hash and the company
// name — so a test can inspect them directly.
function fakeRepo(seed: AuthUser[] = []): AuthRepo & { rows: AuthUser[]; companies: string[] } {
  const rows: AuthUser[] = [...seed];
  const companies: string[] = [];
  let n = 0;
  return {
    rows,
    companies,
    async findByEmail(email) {
      return rows.find((u) => u.email === email) ?? null;
    },
    async createOrgWithOwner(input: NewOrgOwner) {
      companies.push(input.company);
      const u: AuthUser = {
        id: `u${++n}`,
        orgId: `org${n}`,
        email: input.email,
        name: input.name,
        role: "manager",
        passwordHash: input.passwordHash,
      };
      rows.push(u);
      return u;
    },
  };
}

// A deterministic, non-real hasher for the fast logic tests: a wrong password could
// never collide with this scramble, and it's obviously NOT the raw password.
const fakeHasher: PasswordHasher = {
  async hash(plain) {
    return `scrambled:${plain}`;
  },
  async verify(plain, hash) {
    return hash === `scrambled:${plain}`;
  },
};

test("register stores only a scramble — never the raw password — and never returns the hash", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);

  const user = await service.register({ email: "Amy@Acme.com", name: "Amy", password: "correct horse" });

  // What got persisted is the scramble, not the typed password.
  const stored = repo.rows[0];
  assert.ok(stored);
  assert.notEqual(stored.passwordHash, "correct horse");
  assert.equal(stored.passwordHash, "scrambled:correct horse");
  // The email is normalized (lower-cased) on the way in.
  assert.equal(stored.email, "amy@acme.com");
  // Nothing handed back to the caller carries the hash.
  assert.equal("passwordHash" in user, false);
  assert.equal(user.email, "amy@acme.com");
  assert.ok(user.orgId); // a company was created for them
});

test("register creates a company and makes the person its manager", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);
  const user = await service.register({ email: "gita@acme.com", name: "Gita", password: "longenough1" });
  assert.ok(user.orgId, "a company id was assigned");
  assert.equal(user.role, "manager");
  assert.equal(repo.companies.length, 1); // exactly one company created
});

test("the company name defaults to the person's name, or uses the one given", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);
  await service.register({ email: "hugo@acme.com", name: "Hugo", password: "longenough1" });
  assert.equal(repo.companies[0], "Hugo's Company");
  await service.register({ email: "ivy@acme.com", name: "Ivy", password: "longenough1", company: "Acme Inc" });
  assert.equal(repo.companies[1], "Acme Inc");
});

test("login accepts the right password and rejects the wrong one", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);
  await service.register({ email: "bob@acme.com", name: "Bob", password: "hunter2hunter2" });

  const ok = await service.login({ email: "bob@acme.com", password: "hunter2hunter2" });
  assert.equal(ok.email, "bob@acme.com");

  await assert.rejects(
    () => service.login({ email: "bob@acme.com", password: "wrong-password" }),
    /incorrect/i,
  );
});

test("login on an unknown email is refused with the same message (no account-existence leak)", async () => {
  const service = createAuthService(fakeRepo(), fakeHasher);
  await assert.rejects(() => service.login({ email: "nobody@acme.com", password: "whatever12" }), /incorrect/i);
});

test("login: a deactivated user is refused even with the RIGHT password (user-management Phase 3)", async () => {
  // A registered, correct-password user who has since been switched off.
  const seeded: AuthUser = {
    id: "u1", orgId: "o1", email: "gone@acme.com", name: "Gone", role: "member",
    passwordHash: "scrambled:rightpassword", deactivatedAt: new Date("2026-01-01"),
  };
  const service = createAuthService(fakeRepo([seeded]), fakeHasher);
  await assert.rejects(
    () => service.login({ email: "gone@acme.com", password: "rightpassword" }),
    /deactivated/i,
  );
});

test("login is case-insensitive on the email", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);
  await service.register({ email: "cara@acme.com", name: "Cara", password: "longenough1" });
  const ok = await service.login({ email: "CARA@Acme.com", password: "longenough1" });
  assert.equal(ok.email, "cara@acme.com");
});

test("a too-short password is refused", async () => {
  const service = createAuthService(fakeRepo(), fakeHasher);
  await assert.rejects(() => service.register({ email: "d@acme.com", name: "D", password: "short" }), /at least/i);
});

test("a duplicate email is refused", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);
  await service.register({ email: "eve@acme.com", name: "Eve", password: "longenough1" });
  await assert.rejects(
    () => service.register({ email: "Eve@acme.com", name: "Eve Again", password: "longenough1" }),
    /already registered/i,
  );
});

test("with the REAL bcrypt hasher, the stored value is a bcrypt scramble that verifies", async () => {
  const repo = fakeRepo();
  const realHasher: PasswordHasher = {
    hash: (plain) => bcrypt.hash(plain, 10),
    verify: (plain, hash) => bcrypt.compare(plain, hash),
  };
  const service = createAuthService(repo, realHasher);

  await service.register({ email: "frank@acme.com", name: "Frank", password: "s3cretpassword" });
  const stored = repo.rows[0]?.passwordHash ?? "";

  assert.notEqual(stored, "s3cretpassword");
  assert.match(stored, /^\$2[aby]\$/); // a bcrypt hash, not the raw password
  const ok = await service.login({ email: "frank@acme.com", password: "s3cretpassword" });
  assert.equal(ok.email, "frank@acme.com");
});

// --- Password reset (forgot-password) ------------------------------------------------
// The same seam pattern: an in-memory PasswordResetRepo proves the reset logic never
// depends on Postgres, and lets a test read back exactly what was stored (the token
// HASH, never the raw token) and the user's new password hash.

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

type StoredResetUser = ResetUser & { passwordHash?: string };
interface StoredResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

function fakeResetRepo(seed: ResetUser[] = []): PasswordResetRepo & {
  users: StoredResetUser[];
  tokens: StoredResetToken[];
} {
  const users: StoredResetUser[] = seed.map((u) => ({ ...u }));
  const tokens: StoredResetToken[] = [];
  let n = 0;
  return {
    users,
    tokens,
    async findUserByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async createResetToken(input) {
      tokens.push({ id: `t${++n}`, userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt, usedAt: null });
    },
    async findByTokenHash(tokenHash) {
      const t = tokens.find((x) => x.tokenHash === tokenHash);
      return t ? { id: t.id, userId: t.userId, expiresAt: t.expiresAt, usedAt: t.usedAt } : null;
    },
    async markUsed(id) {
      const t = tokens.find((x) => x.id === id);
      if (t) t.usedAt = new Date();
    },
    async updatePasswordHash(userId, passwordHash) {
      const u = users.find((x) => x.id === userId);
      if (u) u.passwordHash = passwordHash;
    },
  };
}

test("requestPasswordReset mints a token for a known active user and stores only its hash", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "amy@acme.com", deactivatedAt: null }]);
  const service = createPasswordResetService(repo, fakeHasher);

  const result = await service.requestPasswordReset("Amy@Acme.com"); // normalized on the way in
  assert.ok(result);
  assert.equal(result.email, "amy@acme.com");
  assert.ok(result.token.length >= 32);
  // Exactly one row, stored as the sha256 of the raw token — never the raw token itself.
  assert.equal(repo.tokens.length, 1);
  assert.equal(repo.tokens[0]!.tokenHash, sha256(result.token));
  assert.notEqual(repo.tokens[0]!.tokenHash, result.token);
});

test("requestPasswordReset on an unknown email returns null and stores nothing (no leak)", async () => {
  const repo = fakeResetRepo();
  const service = createPasswordResetService(repo, fakeHasher);
  const result = await service.requestPasswordReset("nobody@acme.com");
  assert.equal(result, null);
  assert.equal(repo.tokens.length, 0);
});

test("requestPasswordReset on a deactivated account returns null and stores nothing", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "gone@acme.com", deactivatedAt: new Date("2026-01-01") }]);
  const service = createPasswordResetService(repo, fakeHasher);
  const result = await service.requestPasswordReset("gone@acme.com");
  assert.equal(result, null);
  assert.equal(repo.tokens.length, 0);
});

test("resetPassword with a valid token sets the new password hash and burns the token", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "amy@acme.com", deactivatedAt: null }]);
  const service = createPasswordResetService(repo, fakeHasher);
  const req = await service.requestPasswordReset("amy@acme.com");
  assert.ok(req);

  await service.resetPassword(req.token, "brandnewpass");
  assert.equal(repo.users[0]!.passwordHash, "scrambled:brandnewpass");
  assert.ok(repo.tokens[0]!.usedAt, "token was marked used");
});

test("resetPassword refuses an already-used token", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "amy@acme.com", deactivatedAt: null }]);
  const service = createPasswordResetService(repo, fakeHasher);
  const req = await service.requestPasswordReset("amy@acme.com");
  assert.ok(req);
  await service.resetPassword(req.token, "brandnewpass");
  await assert.rejects(() => service.resetPassword(req.token, "anotherpass1"), /valid/i);
});

test("resetPassword refuses an expired token", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "amy@acme.com", deactivatedAt: null }]);
  const service = createPasswordResetService(repo, fakeHasher);
  const req = await service.requestPasswordReset("amy@acme.com");
  assert.ok(req);
  repo.tokens[0]!.expiresAt = new Date(Date.now() - 1000); // force-expire
  await assert.rejects(() => service.resetPassword(req.token, "brandnewpass"), /valid/i);
});

test("resetPassword refuses an unknown token", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "amy@acme.com", deactivatedAt: null }]);
  const service = createPasswordResetService(repo, fakeHasher);
  await assert.rejects(() => service.resetPassword("deadbeef", "brandnewpass"), /valid/i);
});

test("resetPassword refuses a too-short new password and does NOT burn the token", async () => {
  const repo = fakeResetRepo([{ id: "u1", email: "amy@acme.com", deactivatedAt: null }]);
  const service = createPasswordResetService(repo, fakeHasher);
  const req = await service.requestPasswordReset("amy@acme.com");
  assert.ok(req);
  await assert.rejects(() => service.resetPassword(req.token, "short"), /at least/i);
  assert.equal(repo.tokens[0]!.usedAt, null); // still usable — they can retry
});
