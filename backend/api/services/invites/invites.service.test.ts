import { test } from "node:test";
import assert from "node:assert/strict";
import { createInvitesService } from "./invites.service.ts";
import type { InvitesRepo, InviteRow } from "./invites.repo.ts";

// The join flow (member-onboarding-invites): a manager invites a roster person by email →
// a one-time link; opening it shows who invited you where; accepting creates the member
// account IN THAT ORG and auto-links the roster row. Token rules (user-management P5):
// single-use, expiring, stored hashed, the raw token never at rest. In-memory deps — no DB.

function fakeRepo() {
  const invites: (InviteRow & { id: string })[] = [];
  const usersByEmail = new Map<string, { id: string }>([["taken@qa.test", { id: "u-existing" }]]);
  const linked: Record<string, string> = {};
  let n = 0;
  const repo: InvitesRepo = {
    findPersonForManager: async (id, orgId, managerId) =>
      id === "p1" && orgId === "o1" && managerId === "m1" ? { id: "p1", name: "Priya QA", userId: null } : null,
    // status: the DB default; personId nullable (absent for a workspace invite); openedAt null until opened.
    insertInvite: async (row) => { const r = { status: "pending", ...row, personId: row.personId ?? null, openedAt: null as Date | null, id: `i${++n}` }; invites.push(r); return { id: r.id }; },
    findByTokenHash: async (hash) => invites.find((i) => i.tokenHash === hash) ?? null,
    markAccepted: async (id) => { const i = invites.find((x) => x.id === id); if (i) i.status = "accepted"; },
    markOpened: async (id) => { const i = invites.find((x) => x.id === id); if (i && !i.openedAt) i.openedAt = new Date(); },
    findPendingInviteForOrg: async (id, orgId) => invites.find((i) => i.id === id && i.orgId === orgId && i.status === "pending") ?? null,
    updateInviteToken: async (id, tokenHash, expiresAt) => { const i = invites.find((x) => x.id === id); if (i) { i.tokenHash = tokenHash; i.expiresAt = expiresAt; } },
    setInviteStatus: async (id, status) => { const i = invites.find((x) => x.id === id); if (i) i.status = status; },
    findUserByEmail: async (email) => usersByEmail.get(email) ?? null,
    createMemberUser: async ({ orgId, email, name, role }) => {
      const u = { id: `u${++n}`, orgId, email, name, role };
      usersByEmail.set(email, { id: u.id });
      return u;
    },
    linkPersonUser: async (personId, userId) => { linked[personId] = userId; },
    orgName: async (orgId) => (orgId === "o1" ? "QA Co" : "?"),
    userName: async (userId) => (userId === "m1" ? "QA Manager" : null),
    personName: async (personId) => (personId === "p1" ? "Priya QA" : null),
  };
  return { repo, invites, linked };
}

const hasher = { hash: async (pw: string) => `hashed:${pw}` };

test("create mints a token, stores only its hash, and pins expiry", async () => {
  const { repo, invites } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const out = await svc.create("o1", "m1", "p1", "  Priya@QA.test ");
  assert.ok(out.token.length >= 32, "long random token");
  assert.equal(invites.length, 1);
  assert.notEqual(invites[0]!.tokenHash, out.token); // hashed at rest, never raw
  assert.equal(invites[0]!.email, "priya@qa.test"); // normalized
  assert.equal(invites[0]!.personId, "p1");
  assert.ok(invites[0]!.expiresAt.getTime() > Date.now());
});

test("create on someone else's person answers not-found", async () => {
  const { repo } = fakeRepo();
  await assert.rejects(() => createInvitesService(repo, hasher).create("o1", "OTHER", "p1", "a@b.c"), /not found/i);
});

test("create refuses a blank or nonsense email", async () => {
  const { repo } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  await assert.rejects(() => svc.create("o1", "m1", "p1", "   "), /email/i);
  await assert.rejects(() => svc.create("o1", "m1", "p1", "not-an-email"), /email/i);
});

test("preview shows who invited you where; a wrong token is not-found", async () => {
  const { repo } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.create("o1", "m1", "p1", "priya@qa.test");
  const p = await svc.preview(token);
  assert.deepEqual(p, { orgName: "QA Co", inviterName: "QA Manager", personName: "Priya QA", email: "priya@qa.test" });
  await assert.rejects(() => svc.preview("bogus-token"), /invite/i);
});

test("accept creates the member in the inviter's org, links the person, single-use", async () => {
  const { repo, invites, linked } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.create("o1", "m1", "p1", "priya@qa.test");
  const { user } = await svc.accept(token, { name: "Priya", password: "longenough1" });
  assert.equal(user.orgId, "o1");
  assert.equal(user.role, "member");
  assert.equal(linked["p1"], user.id); // roster row auto-linked
  assert.equal(invites[0]!.status, "accepted");
  await assert.rejects(() => svc.accept(token, { name: "x", password: "longenough1" }), /invite/i); // used up
});

test("an expired invite is rejected for preview and accept", async () => {
  const { repo, invites } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.create("o1", "m1", "p1", "priya@qa.test");
  invites[0]!.expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(() => svc.preview(token), /invite/i);
  await assert.rejects(() => svc.accept(token, { name: "x", password: "longenough1" }), /invite/i);
});

test("accept refuses a short password and an email that already has an account", async () => {
  const { repo } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.create("o1", "m1", "p1", "taken@qa.test");
  await assert.rejects(() => svc.accept(token, { name: "x", password: "short" }), /password/i);
  await assert.rejects(() => svc.accept(token, { name: "x", password: "longenough1" }), /already has an account/i);
});

test("createForOrg mints a person-less invite carrying the chosen role", async () => {
  const { repo, invites } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const out = await svc.createForOrg("o1", "m1", " New@QA.test ", "manager");
  assert.ok(out.token.length >= 32);
  assert.equal(invites.length, 1);
  assert.equal(invites[0]!.email, "new@qa.test"); // normalized
  assert.equal(invites[0]!.role, "manager");
  assert.equal(invites[0]!.personId, null); // workspace invite — no roster person
});

test("createForOrg refuses a bad email or a role it can't hand out", async () => {
  const { repo } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  await assert.rejects(() => svc.createForOrg("o1", "m1", "nope", "member"), /email/i);
  await assert.rejects(() => svc.createForOrg("o1", "m1", "a@b.co", "admin"), /role/i); // admin reserved
  await assert.rejects(() => svc.createForOrg("o1", "m1", "a@b.co", "wizard"), /role/i);
});

test("accept mints the user with the invite's role (manager, not defaulted to member)", async () => {
  const { repo } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.createForOrg("o1", "m1", "boss@qa.test", "manager");
  const { user } = await svc.accept(token, { name: "Boss", password: "longenough1" });
  assert.equal(user.role, "manager"); // the chosen role flowed through accept
});

test("opening the join link stamps opened_at once; the internal preview never does", async () => {
  const { repo, invites } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.createForOrg("o1", "m1", "opener@qa.test", "member");
  assert.equal(invites[0]!.openedAt, null); // sent, not opened
  await svc.preview(token, { stampOpen: true }); // the invitee opens their /join link
  const first = invites[0]!.openedAt;
  assert.ok(first, "opened_at is stamped on first open");
  await svc.preview(token, { stampOpen: true }); // re-open keeps the first timestamp
  assert.equal(invites[0]!.openedAt, first);
  // The internal reuse (composing the invite email) must NOT self-mark opened.
  const { token: t2 } = await svc.createForOrg("o1", "m1", "quiet@qa.test", "member");
  await svc.preview(t2);
  assert.equal(invites[1]!.openedAt, null);
});

test("revokeForOrg kills a pending invite — the old link stops working; wrong org is not-found", async () => {
  const { repo, invites } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const { token } = await svc.createForOrg("o1", "m1", "gone@qa.test", "member");
  const id = invites[0]!.id;
  await assert.rejects(() => svc.revokeForOrg("o2", id), /invite/i); // fenced to the org
  await svc.revokeForOrg("o1", id);
  assert.equal(invites[0]!.status, "revoked");
  await assert.rejects(() => svc.preview(token), /invite/i); // old link now dead
});

test("resendForOrg mints a fresh token — old link dies, new link previews", async () => {
  const { repo, invites } = fakeRepo();
  const svc = createInvitesService(repo, hasher);
  const first = await svc.createForOrg("o1", "m1", "again@qa.test", "member");
  const id = invites[0]!.id;
  const second = await svc.resendForOrg("o1", id);
  assert.notEqual(second.token, first.token); // fresh token
  await assert.rejects(() => svc.preview(first.token), /invite/i); // old token dead
  const p = await svc.preview(second.token);
  assert.equal(p.email, "again@qa.test"); // new token still points at the same invite
});
