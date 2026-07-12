import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuidedSessionsService } from "./guided-sessions.service.ts";
import type { GuidedPeopleGateway } from "./guided-sessions.service.ts";
import type { GuidedSessionsRepo, GuidedSessionRow } from "./guided-sessions.repo.ts";

// In-memory fakes prove the service logic + fences without a database (the house pattern).
const CALLER = { orgId: "org-1", managerId: "mgr-1" };

function fakeRepo(): GuidedSessionsRepo {
  const rows = new Map<string, GuidedSessionRow>();
  let n = 0;
  return {
    async insert(f) {
      const now = new Date();
      const row: GuidedSessionRow = {
        id: `gs-${++n}`,
        orgId: f.orgId,
        managerId: f.managerId,
        personId: f.personId,
        personName: f.personName,
        stage: f.stage,
        state: f.state,
        engagement: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      rows.set(row.id, row);
      return row;
    },
    async findForManager(id, orgId, managerId) {
      const r = rows.get(id);
      return r && r.orgId === orgId && r.managerId === managerId ? r : null;
    },
    async listForPerson(personId, orgId, managerId) {
      return [...rows.values()].filter(
        (r) => r.personId === personId && r.orgId === orgId && r.managerId === managerId,
      );
    },
    async update(id, patch) {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...patch, updatedAt: new Date() });
    },
  };
}

// owned keyed by `${personId}:${orgId}:${managerId}` — a hit means the caller owns that person.
function fakePeople(owned: Record<string, { id: string; name: string }>): GuidedPeopleGateway {
  return {
    async findForManager(id, orgId, managerId) {
      return owned[`${id}:${orgId}:${managerId}`] ?? null;
    },
  };
}

const AISHA = { "p1:org-1:mgr-1": { id: "p1", name: "Aisha" } };

test("create fences the person to the caller (foreign person → not found)", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  const created = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  assert.equal(created.personName, "Aisha");
  assert.equal(created.stage, "catchup");
  assert.equal(created.state.step, 0);
  assert.deepEqual(created.state.visited, [0]);
  assert.equal(created.completedAt, null);
  await assert.rejects(
    () => svc.create(CALLER.orgId, CALLER.managerId, { personId: "not-mine" }),
    /not found/i,
  );
});

test("get is fenced — another manager's / org's / an unknown session is not found", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  await assert.rejects(() => svc.get(gs.id, CALLER.orgId, "mgr-OTHER"), /not found/i);
  await assert.rejects(() => svc.get(gs.id, "org-OTHER", CALLER.managerId), /not found/i);
  await assert.rejects(() => svc.get("nope", CALLER.orgId, CALLER.managerId), /not found/i);
});

test("patch auto-saves stage + state; a reload reads them back", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  const state = {
    v: 1,
    arc: "monthly_check_in",
    step: 1,
    visited: [0, 1],
    catchup: { notes: "went well" },
  };
  await svc.patch(gs.id, CALLER.orgId, CALLER.managerId, { stage: "requests", state });
  const reloaded = await svc.get(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(reloaded.stage, "requests");
  assert.equal(reloaded.state.step, 1);
  assert.deepEqual(reloaded.state.catchup, { notes: "went well" });
});

test("patch is fenced and rejects an unknown stage / a non-object state", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  await assert.rejects(
    () => svc.patch(gs.id, CALLER.orgId, "mgr-OTHER", { stage: "requests" }),
    /not found/i,
  );
  await assert.rejects(
    () => svc.patch(gs.id, CALLER.orgId, CALLER.managerId, { stage: "haxxor" }),
    /unknown stage/i,
  );
  await assert.rejects(
    () => svc.patch(gs.id, CALLER.orgId, CALLER.managerId, { state: [1, 2, 3] }),
    /must be an object/i,
  );
});

test("complete flips to done, stamps completion, is idempotent, and freezes edits", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  const done = await svc.complete(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(done.stage, "done");
  assert.ok(done.completedAt);
  const again = await svc.complete(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(again.completedAt, done.completedAt); // idempotent — no second write
  await assert.rejects(
    () => svc.patch(gs.id, CALLER.orgId, CALLER.managerId, { stage: "requests" }),
    /already finished/i,
  );
});

test("listForPerson is fenced and returns the person's sessions", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  const list = await svc.listForPerson("p1", CALLER.orgId, CALLER.managerId);
  assert.equal(list.sessions.length, 1);
  await assert.rejects(() => svc.listForPerson("p1", CALLER.orgId, "mgr-OTHER"), /not found/i);
});
