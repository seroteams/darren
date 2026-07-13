import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuidedSessionsService } from "./guided-sessions.service.ts";
import type { GuidedSessionsRepo, GuidedSessionRow } from "./guided-sessions.repo.ts";
import type { PeopleRepo } from "../team/people.repo.ts";

// ── In-memory fakes — the service is pure over these, so no DB is needed ──────────
const ORG = "org-1";
const MGR = "mgr-1";
const PERSON = "person-1";

// A people repo that only knows PERSON belongs to (ORG, MGR). Anything else → null,
// exactly like the org+manager fence in the real repo.
function fakePeople(): Pick<PeopleRepo, "findForManager"> {
  return {
    async findForManager(id, orgId, managerId) {
      if (id === PERSON && orgId === ORG && managerId === MGR) {
        return {
          id: PERSON, orgId: ORG, managerId: MGR, name: "Aisha",
          role: null, seniority: null, userId: null, mergedIntoId: null, archivedAt: null,
        };
      }
      return null;
    },
  };
}

function fakeRepo(): GuidedSessionsRepo {
  const rows = new Map<string, GuidedSessionRow>();
  let n = 0;
  return {
    async create(fields) {
      const now = new Date();
      const row: GuidedSessionRow = {
        id: `gs-${++n}`, orgId: fields.orgId, managerId: fields.managerId, personId: fields.personId,
        personName: fields.personName, stage: fields.stage, state: fields.state, engagement: null,
        createdAt: now, updatedAt: now, completedAt: null,
      };
      rows.set(row.id, row);
      return row;
    },
    async findForManager(id, orgId, managerId) {
      const r = rows.get(id);
      return r && r.orgId === orgId && r.managerId === managerId ? r : null;
    },
    async listForPerson(personId, orgId, managerId) {
      return [...rows.values()].filter((r) => r.personId === personId && r.orgId === orgId && r.managerId === managerId);
    },
    async update(id, patch) {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...patch, updatedAt: new Date() });
    },
  };
}

function svc() {
  return createGuidedSessionsService({ repo: fakeRepo(), people: fakePeople() });
}

test("create opens a session at the catchup stage with a fresh v1 state", async () => {
  const view = await svc().create(ORG, MGR, PERSON);
  assert.equal(view.stage, "catchup");
  assert.deepEqual(view.state, { v: 1 });
  assert.equal(view.personId, PERSON);
  assert.equal(view.completedAt, null);
});

test("create 404s for a person the caller does not manage (the person-fence)", async () => {
  const service = svc();
  await assert.rejects(() => service.create(ORG, MGR, "someone-elses-person"), /Person not found/);
  // right person, wrong manager → still 404
  await assert.rejects(() => service.create(ORG, "other-mgr", PERSON), /Person not found/);
});

test("get is fenced to the caller's org + manager", async () => {
  const service = svc();
  const created = await service.create(ORG, MGR, PERSON);
  // owner reads it
  assert.equal((await service.get(created.id, ORG, MGR)).id, created.id);
  // another manager guessing the id → 404
  await assert.rejects(() => service.get(created.id, ORG, "other-mgr"), /not found/i);
});

test("patch saves stage + state and 400s an unknown stage", async () => {
  const service = svc();
  const created = await service.create(ORG, MGR, PERSON);
  const saved = await service.patch(created.id, ORG, MGR, { stage: "rating", state: { v: 1, catchup: { notes: "hi" } } });
  assert.equal(saved.stage, "rating");
  assert.deepEqual(saved.state, { v: 1, catchup: { notes: "hi" } });
  await assert.rejects(() => service.patch(created.id, ORG, MGR, { stage: "bogus" }), /Unknown stage/);
});

test("patch is fenced — another manager can't write to the session", async () => {
  const service = svc();
  const created = await service.create(ORG, MGR, PERSON);
  await assert.rejects(() => service.patch(created.id, ORG, "other-mgr", { stage: "rating" }), /not found/i);
});

test("complete flips the session to done and stamps completedAt", async () => {
  const service = svc();
  const created = await service.create(ORG, MGR, PERSON);
  const done = await service.complete(created.id, ORG, MGR);
  assert.equal(done.stage, "done");
  assert.ok(done.completedAt, "completedAt is set");
});

test("listForPerson returns the person's sessions and is person-fenced", async () => {
  const service = svc();
  await service.create(ORG, MGR, PERSON);
  await service.create(ORG, MGR, PERSON);
  const list = await service.listForPerson(PERSON, ORG, MGR);
  assert.equal(list.length, 2);
  await assert.rejects(() => service.listForPerson("nope", ORG, MGR), /Person not found/);
});
