import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createAuthService } from "./auth.service.ts";
import type { PasswordHasher } from "./auth.service.ts";
import type { AuthRepo, AuthUser, NewOrgOwner } from "./auth.repo.ts";

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
        role: "owner",
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

test("register creates a company and makes the person its owner", async () => {
  const repo = fakeRepo();
  const service = createAuthService(repo, fakeHasher);
  const user = await service.register({ email: "gita@acme.com", name: "Gita", password: "longenough1" });
  assert.ok(user.orgId, "a company id was assigned");
  assert.equal(user.role, "owner");
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
