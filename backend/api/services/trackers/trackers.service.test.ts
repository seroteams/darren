import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTrackersService,
  trackerOwnedByManagerOrg,
  trackerVisibleToMember,
} from "./trackers.service.ts";
import type { TrackerPeopleGateway } from "./trackers.service.ts";
import type { TrackerItemRow, TrackersRepo } from "./trackers.repo.ts";

const CALLER = { orgId: "org-1", managerId: "mgr-1" };
const AISHA: Record<string, { id: string; name: string }> = { "p1:org-1:mgr-1": { id: "p1", name: "Aisha" } };

function fakeRepo(): TrackersRepo {
  const rows = new Map<string, TrackerItemRow>();
  let n = 0;
  return {
    async listForPerson(personId, orgId) {
      return [...rows.values()].filter((r) => r.personId === personId && r.orgId === orgId);
    },
    async findById(id, orgId) {
      const r = rows.get(id);
      return r && r.orgId === orgId ? r : null;
    },
    async insert(f) {
      const now = new Date();
      const row: TrackerItemRow = { id: `t-${++n}`, archivedAt: null, createdAt: now, updatedAt: now, ...f };
      rows.set(row.id, row);
      return row;
    },
    async update(id, patch) {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...patch, updatedAt: new Date() });
    },
  };
}

function fakePeople(
  owned: Record<string, { id: string; name: string }>,
  linked: Record<string, { id: string }[]> = {},
): TrackerPeopleGateway {
  return {
    async findForManager(id, orgId, managerId) {
      return owned[`${id}:${orgId}:${managerId}`] ?? null;
    },
    async findByLinkedUser(userId, orgId) {
      return linked[`${userId}:${orgId}`] ?? [];
    },
  };
}

test("create validates kind + text, sets initial status + a created history event, person-fenced", async () => {
  const svc = createTrackersService(fakeRepo(), fakePeople(AISHA));
  const { item } = await svc.create("p1", CALLER.orgId, CALLER.managerId, {
    kind: "request",
    text: "shadow a senior",
    category: "growth_development",
  });
  assert.equal(item.kind, "request");
  assert.equal(item.status, "new");
  assert.equal(item.category, "growth_development");
  assert.equal(item.history[0]?.type, "created");
  await assert.rejects(() => svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "nope", text: "x" }), /kind must be/i);
  await assert.rejects(() => svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "request", text: "  " }), /text is required/i);
  await assert.rejects(() => svc.create("not-mine", CALLER.orgId, CALLER.managerId, { kind: "goal", text: "x" }), /not found/i);
});

test("promise defaults owner=manager/status=open; a bad owner is rejected", async () => {
  const svc = createTrackersService(fakeRepo(), fakePeople(AISHA));
  const { item } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "book the buddy" });
  assert.equal(item.owner, "manager");
  assert.equal(item.status, "open");
  await assert.rejects(
    () => svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "x", owner: "alien" }),
    /owner must be/i,
  );
});

test("update: status change + progress clamp + note each append history; wrong-kind status rejected", async () => {
  const svc = createTrackersService(fakeRepo(), fakePeople(AISHA));
  const { item: g } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "goal", text: "own a feature" });
  const { item: u } = await svc.update(g.id, CALLER.orgId, CALLER.managerId, {
    status: "in_progress",
    progress: 140,
    note: "spoke up twice",
  });
  assert.equal(u.status, "in_progress");
  assert.equal(u.progress, 100); // clamped 0–100
  const types = u.history.map((h) => h.type);
  assert.ok(types.includes("status") && types.includes("progress") && types.includes("note"));
  await assert.rejects(
    () => svc.update(g.id, CALLER.orgId, CALLER.managerId, { status: "resolved" }),
    /invalid status for a goal/i,
  );
});

test("update + applyOutcome are fenced; applyOutcome resolves a promise", async () => {
  const svc = createTrackersService(fakeRepo(), fakePeople(AISHA));
  const { item: p } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "send the budget" });
  await assert.rejects(() => svc.update(p.id, CALLER.orgId, "mgr-OTHER", { status: "done" }), /not found/i);
  const { item } = await svc.applyOutcome(p.id, CALLER.orgId, CALLER.managerId, "yes");
  assert.equal(item.status, "done");
  assert.equal(item.history.at(-1)?.type, "outcome");
  await assert.rejects(() => svc.applyOutcome(p.id, CALLER.orgId, CALLER.managerId, "??"), /unknown outcome/i);
});

test("listForPerson groups by kind, manager promises first, hides archived by default, fenced", async () => {
  const svc = createTrackersService(fakeRepo(), fakePeople(AISHA));
  await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "member one", owner: "member" });
  await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "manager one", owner: "manager" });
  const { item: req } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "request", text: "a request" });
  await svc.update(req.id, CALLER.orgId, CALLER.managerId, { archived: true });
  const g = await svc.listForPerson("p1", CALLER.orgId, CALLER.managerId);
  assert.equal(g.promises.length, 2);
  assert.equal(g.promises[0]?.owner, "manager"); // manager's own first
  assert.equal(g.requests.length, 0); // archived hidden
  const withArch = await svc.listForPerson("p1", CALLER.orgId, CALLER.managerId, { includeArchived: true });
  assert.equal(withArch.requests.length, 1);
  await assert.rejects(() => svc.listForPerson("p1", CALLER.orgId, "mgr-OTHER"), /not found/i);
});

const MEMBER = { userId: "mem-1", orgId: "org-1" };
const AISHA_LINKED: Record<string, { id: string }[]> = { "mem-1:org-1": [{ id: "p1" }] };

test("member lane: lists own request/goal only (never promises); can raise a request; unlinked → empty", async () => {
  const svc = createTrackersService(fakeRepo(), fakePeople(AISHA, AISHA_LINKED));
  await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "manager promise" });
  await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "request", text: "shadow a senior" });
  await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "goal", text: "own a feature" });
  const mine = await svc.listForMember(MEMBER.userId, MEMBER.orgId);
  assert.equal(mine.requests.length, 1);
  assert.equal(mine.goals.length, 1);
  assert.ok(!("promises" in mine)); // a member never sees promises, not even the key
  const { item } = await svc.createRequestForMember(MEMBER.userId, MEMBER.orgId, { text: "clearer sprint priorities", category: "concerns_feedback" });
  assert.equal(item.kind, "request");
  assert.equal(item.status, "new");
  // an unlinked member sees nothing (clean empty, not an error)
  const svc2 = createTrackersService(fakeRepo(), fakePeople(AISHA, {}));
  assert.deepEqual(await svc2.listForMember("nobody", "org-1"), { requests: [], goals: [] });
});

test("member goal fence: own goal updates; a promise / request / another person's id all 404", async () => {
  const repo = fakeRepo();
  const svc = createTrackersService(repo, fakePeople(AISHA, AISHA_LINKED));
  const { item: goal } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "goal", text: "own a feature" });
  const { item: promise } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "promise", text: "manager promise" });
  const { item: req } = await svc.create("p1", CALLER.orgId, CALLER.managerId, { kind: "request", text: "a request" });
  const { item: u } = await svc.updateGoalForMember(MEMBER.userId, MEMBER.orgId, goal.id, { progress: 60, note: "made headway" });
  assert.equal(u.progress, 60);
  assert.ok(u.history.some((h) => h.type === "progress") && u.history.some((h) => h.type === "note"));
  await assert.rejects(() => svc.updateGoalForMember(MEMBER.userId, MEMBER.orgId, promise.id, { progress: 50 }), /not found/i); // never a promise
  await assert.rejects(() => svc.updateGoalForMember(MEMBER.userId, MEMBER.orgId, req.id, { progress: 50 }), /not found/i); // must be a goal
  const svcOther = createTrackersService(repo, fakePeople(AISHA, { "mem-2:org-1": [{ id: "p-other" }] }));
  await assert.rejects(() => svcOther.updateGoalForMember("mem-2", "org-1", goal.id, { progress: 50 }), /not found/i); // another person's goal
});

test("member wall never exposes promises / another person; manager wall org-scoped", () => {
  const base = {
    id: "t1",
    orgId: "org-1",
    personId: "p1",
    createdByUserId: null,
    text: "x",
    owner: null,
    category: null,
    status: "new",
    progress: 0,
    history: [],
    createdSessionId: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  assert.equal(trackerVisibleToMember({ ...base, kind: "request" }, ["p1"], "org-1"), true);
  assert.equal(trackerVisibleToMember({ ...base, kind: "promise" }, ["p1"], "org-1"), false);
  assert.equal(trackerVisibleToMember({ ...base, kind: "goal" }, ["p-other"], "org-1"), false);
  assert.equal(trackerOwnedByManagerOrg({ ...base, kind: "request" }, "org-other"), false);
});
