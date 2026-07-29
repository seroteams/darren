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

// ── audit-fixes-jul-25 F16: rank check on role changes ───────────────────────────
// `requireAdmin` on the members routes lets managers AND admins through, which is right
// for managing members but meant a plain manager could demote or switch off the admin
// account that runs the workspace. Only an admin may act on an admin.

const asManager = { userId: "mgr1", email: "mgr@qa.test" };
const asAdmin = { userId: "adm1", email: "adm@qa.test" };
// Every fixture below carries a spare active manager so the last-lead guard is never the
// thing doing the rejecting — these tests must fail for the RANK reason or not at all.
const rankUsers = () => [
  user({ id: "mgr1", role: "manager", email: "mgr@qa.test" }),
  user({ id: "adm1", role: "admin", email: "adm@qa.test" }),
  user({ id: "mem1", role: "member", email: "mem@qa.test" }),
  user({ id: "spare", role: "manager", email: "spare@qa.test" }),
];

test("setRole refuses a manager acting on an admin", async () => {
  const svc = createMembersService(fakeRepo({ users: rankUsers() }));
  await assert.rejects(() => svc.setRole("o1", asManager, "adm1", "member"), /only an admin/i);
});

test("setRole still lets a manager act on a manager or a member", async () => {
  const seed = { users: rankUsers() };
  const svc = createMembersService(fakeRepo(seed));
  await svc.setRole("o1", asManager, "mem1", "manager");
  assert.equal(seed.users[2]!.role, "manager");
  await svc.setRole("o1", asManager, "spare", "member");
  assert.equal(seed.users[3]!.role, "member");
});

test("setRole still lets an admin change anyone, including another admin", async () => {
  const seed = { users: rankUsers() };
  const svc = createMembersService(fakeRepo(seed));
  await svc.setRole("o1", asAdmin, "adm1", "manager");
  assert.equal(seed.users[1]!.role, "manager");
});

test("deactivate refuses a manager switching off an admin (same hole, same guard)", async () => {
  const svc = createMembersService(fakeRepo({ users: rankUsers() }));
  await assert.rejects(() => svc.deactivate("o1", asManager, "adm1"), /only an admin/i);
});

test("deactivate still lets an admin switch off ANOTHER admin", async () => {
  // Not adm1 acting on adm1 — that trips the older self-deactivate guard, not this one.
  const seed = { users: [...rankUsers(), user({ id: "adm2", role: "admin", email: "adm2@qa.test" })] };
  const svc = createMembersService(fakeRepo(seed));
  await svc.deactivate("o1", asAdmin, "adm2");
  assert.ok(seed.users[4]!.deactivatedAt);
});

test("an actor whose role can't be resolved fails closed against an admin target", async () => {
  // A stranger's userId isn't in the org list, so there is no role to read. Fail closed.
  const svc = createMembersService(fakeRepo({ users: rankUsers() }));
  await assert.rejects(() => svc.setRole("o1", { userId: "ghost", email: "g@qa.test" }, "adm1", "member"), /only an admin/i);
});
