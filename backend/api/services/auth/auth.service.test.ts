import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createAuthService } from "./auth.service.ts";
import type { PasswordHasher } from "./auth.service.ts";
import type { AuthRepo, AuthUser, NewUser } from "./auth.repo.ts";

// In-memory repo: proves the service logic never depends on Postgres (the seam
// check). Captures exactly what register hands createUser, so a test can inspect
// the stored hash directly.
function fakeRepo(seed: AuthUser[] = []): AuthRepo & { rows: AuthUser[] } {
  const rows: AuthUser[] = [...seed];
  let n = 0;
  return {
    rows,
    async findByEmail(email) {
      return rows.find((u) => u.email === email) ?? null;
    },
    async createUser(input: NewUser) {
      const u: AuthUser = { id: `u${++n}`, role: "owner", ...input };
      rows.push(u);
      return u;
    },
    async ensureDefaultOrg() {
      return "org-default";
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
  assert.equal(user.orgId, "org-default");
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
