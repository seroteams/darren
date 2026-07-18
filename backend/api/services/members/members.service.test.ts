import { test } from "node:test";
import assert from "node:assert/strict";
import { createMembersService } from "./members.service.ts";
import type { MembersRepo, OrgUserRow, PendingInviteRow } from "./members.repo.ts";

// The org Members page (members-page Phase 1): merge login accounts + pending invites into
// one list of rows tagged active | invited | deactivated, fenced to the caller's org. An
// in-memory repo proves the merge/sort logic is storage-agnostic — no real database.

function fakeRepo(
  seed: { users?: OrgUserRow[]; invites?: PendingInviteRow[]; revoked?: string[]; audits?: { action: string }[] } = {},
): MembersRepo {
  const users = seed.users ?? [];
  const invites = seed.invites ?? [];
  return {
    listOrgUsers: async (orgId) => (orgId === "o1" ? users : []),
    listPendingInvites: async (orgId) => (orgId === "o1" ? invites : []),
    updateRole: async (id, role) => { const u = users.find((x) => x.id === id); if (u) u.role = role; },
    setDeactivated: async (id, at) => { const u = users.find((x) => x.id === id); if (u) u.deactivatedAt = at; },
    revokeSessions: async (id) => { seed.revoked?.push(id); },
    writeAudit: async (_actor, action) => { seed.audits?.push({ action }); },
  };
}

const actor = { userId: "actor1", email: "boss@qa.test" };

const user = (over: Partial<OrgUserRow>): OrgUserRow => ({
  id: "u0",
  name: "Someone",
  email: "someone@qa.test",
  role: "member",
  deactivatedAt: null,
  createdAt: new Date("2026-01-01"),
  ...over,
});

test("merges accounts + pending invites into tagged rows", async () => {
  const svc = createMembersService(
    fakeRepo({
      users: [user({ id: "u1", name: "Ana", email: "ana@qa.test", role: "manager" })],
      invites: [{ id: "i1", email: "new@qa.test", role: "member", createdAt: new Date(), expiresAt: new Date() }],
    }),
  );
  const { members } = await svc.list("o1");
  assert.equal(members.length, 2);
  const ana = members.find((m) => m.email === "ana@qa.test")!;
  assert.equal(ana.status, "active");
  assert.equal(ana.role, "manager");
  assert.equal(ana.kind, "account");
  const invited = members.find((m) => m.email === "new@qa.test")!;
  assert.equal(invited.status, "invited");
  assert.equal(invited.kind, "invite");
});

test("a deactivated account is tagged deactivated, not hidden", async () => {
  const svc = createMembersService(
    fakeRepo({ users: [user({ id: "u1", email: "off@qa.test", deactivatedAt: new Date() })] }),
  );
  const { members } = await svc.list("o1");
  assert.equal(members[0]!.status, "deactivated");
});

test("orders active first, then invited, then deactivated", async () => {
  const svc = createMembersService(
    fakeRepo({
      users: [
        user({ id: "u1", name: "Zoe", email: "zoe@qa.test" }),
        user({ id: "u2", name: "Off", email: "off@qa.test", deactivatedAt: new Date() }),
      ],
      invites: [{ id: "i1", email: "pending@qa.test", role: "member", createdAt: new Date(), expiresAt: new Date() }],
    }),
  );
  const { members } = await svc.list("o1");
  assert.deepEqual(
    members.map((m) => m.status),
    ["active", "invited", "deactivated"],
  );
});

test("a different org sees nothing (fencing is the repo's job, honoured here)", async () => {
  const svc = createMembersService(fakeRepo({ users: [user({})] }));
  const { members } = await svc.list("o2");
  assert.equal(members.length, 0);
});

test("setRole promotes a member to manager and back, and audits it", async () => {
  const seed = { users: [user({ id: "u1", role: "member" }), user({ id: "u2", role: "manager" })], audits: [] as { action: string }[] };
  const svc = createMembersService(fakeRepo(seed));
  await svc.setRole("o1", actor, "u1", "manager");
  assert.equal(seed.users[0]!.role, "manager");
  await svc.setRole("o1", actor, "u1", "member");
  assert.equal(seed.users[0]!.role, "member");
  assert.ok(seed.audits.some((a) => a.action === "members.setRole"));
});

test("setRole refuses admin / unknown roles and a cross-org target", async () => {
  const svc = createMembersService(fakeRepo({ users: [user({ id: "u1", role: "member" })] }));
  await assert.rejects(() => svc.setRole("o1", actor, "u1", "admin"), /manager or member/i);
  await assert.rejects(() => svc.setRole("o1", actor, "u1", "wizard"), /manager or member/i);
  await assert.rejects(() => svc.setRole("o1", actor, "ghost", "manager"), /(not found|couldn.t find)/i); // not in this org
});

test("setRole blocks demoting the workspace's only active manager", async () => {
  const svc = createMembersService(
    fakeRepo({ users: [user({ id: "u1", role: "manager" }), user({ id: "u2", role: "member" })] }),
  );
  await assert.rejects(() => svc.setRole("o1", actor, "u1", "member"), /only manager/i);
});

test("deactivate switches off + kicks sessions, blocked for self and the last manager", async () => {
  const seed = {
    users: [user({ id: "u1", role: "manager" }), user({ id: "u2", role: "manager" })],
    revoked: [] as string[],
  };
  const svc = createMembersService(fakeRepo(seed));
  await svc.deactivate("o1", actor, "u2");
  assert.ok(seed.users[1]!.deactivatedAt); // switched off
  assert.deepEqual(seed.revoked, ["u2"]); // live sessions dropped
  // now u1 is the only active manager → can't switch it off
  await assert.rejects(() => svc.deactivate("o1", actor, "u1"), /only active manager/i);
  // self-deactivate is blocked
  const solo = createMembersService(fakeRepo({ users: [user({ id: "actor1", role: "manager" }), user({ id: "u9", role: "manager" })] }));
  await assert.rejects(() => solo.deactivate("o1", actor, "actor1"), /your own account/i);
});

test("reactivate restores a switched-off account", async () => {
  const seed = { users: [user({ id: "u1", role: "member", deactivatedAt: new Date() })] };
  const svc = createMembersService(fakeRepo(seed));
  await svc.reactivate("o1", actor, "u1");
  assert.equal(seed.users[0]!.deactivatedAt, null);
});
