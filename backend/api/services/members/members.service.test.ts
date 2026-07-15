import { test } from "node:test";
import assert from "node:assert/strict";
import { createMembersService } from "./members.service.ts";
import type { MembersRepo, OrgUserRow, PendingInviteRow } from "./members.repo.ts";

// The org Members page (members-page Phase 1): merge login accounts + pending invites into
// one list of rows tagged active | invited | deactivated, fenced to the caller's org. An
// in-memory repo proves the merge/sort logic is storage-agnostic — no real database.

function fakeRepo(seed: { users?: OrgUserRow[]; invites?: PendingInviteRow[] } = {}): MembersRepo {
  const users = seed.users ?? [];
  const invites = seed.invites ?? [];
  return {
    listOrgUsers: async (orgId) => (orgId === "o1" ? users : []),
    listPendingInvites: async (orgId) => (orgId === "o1" ? invites : []),
  };
}

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
