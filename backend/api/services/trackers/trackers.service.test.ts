import { test } from "node:test";
import assert from "node:assert/strict";
import { createTrackersService } from "./trackers.service.ts";
import type { TrackersRepo, TrackerItemRow } from "./trackers.repo.ts";
import type { PeopleRepo } from "../team/people.repo.ts";

const ORG = "org-1";
const MGR = "mgr-1";
const PERSON = "person-1";

function fakePeople(): Pick<PeopleRepo, "findForManager"> {
  return {
    async findForManager(id, orgId, managerId) {
      if (id === PERSON && orgId === ORG && managerId === MGR) {
        return { id: PERSON, orgId: ORG, managerId: MGR, name: "Aisha", role: null, seniority: null, userId: null, mergedIntoId: null, archivedAt: null };
      }
      return null;
    },
  };
}

function fakeRepo(): TrackersRepo {
  const rows = new Map<string, TrackerItemRow>();
  let n = 0;
  return {
    async listForPerson(personId, orgId) {
      return [...rows.values()].filter((r) => r.personId === personId && r.orgId === orgId);
    },
    async findForOrg(id, orgId) {
      const r = rows.get(id);
      return r && r.orgId === orgId ? r : null;
    },
    async insert(fields) {
      const now = new Date();
      const row: TrackerItemRow = { id: `t-${++n}`, createdAt: now, updatedAt: now, ...fields };
      rows.set(row.id, row);
      return row;
    },
    async update(id, patch) {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...patch, updatedAt: new Date() });
    },
  };
}

function svc() {
  return createTrackersService({ repo: fakeRepo(), people: fakePeople() });
}

test("create defaults status per kind and records an initial history event", async () => {
  const s = svc();
  const promise = await s.create(ORG, MGR, PERSON, { kind: "promise", text: "Send the training budget", owner: "manager" });
  assert.equal(promise.status, "open");
  assert.equal(promise.owner, "manager");
  assert.equal(promise.history.length, 1);

  const goal = await s.create(ORG, MGR, PERSON, { kind: "goal", text: "Own a feature", progress: 130 });
  assert.equal(goal.status, "not_started");
  assert.equal(goal.progress, 100); // clamped
});

test("create rejects a bad kind / empty text and 404s an unowned person", async () => {
  const s = svc();
  await assert.rejects(() => s.create(ORG, MGR, PERSON, { kind: "nope", text: "x" }), /kind must be/);
  await assert.rejects(() => s.create(ORG, MGR, PERSON, { kind: "goal", text: "  " }), /text is required/);
  await assert.rejects(() => s.create(ORG, MGR, "other-person", { kind: "goal", text: "x" }), /Person not found/);
});

test("listForPerson groups by kind, hides resolved requests + non-open promises, keeps goals", async () => {
  const s = svc();
  const p = await s.create(ORG, MGR, PERSON, { kind: "promise", text: "open promise", owner: "member" });
  await s.create(ORG, MGR, PERSON, { kind: "request", text: "a request", category: "concerns_feedback" });
  await s.create(ORG, MGR, PERSON, { kind: "goal", text: "a goal" });
  // resolve one promise and one request → they drop out of the default view
  await s.update(ORG, MGR, p.id, { status: "done" });

  const def = await s.listForPerson(ORG, MGR, PERSON);
  assert.equal(def.promises.length, 0, "done promise hidden from default");
  assert.equal(def.requests.length, 1);
  assert.equal(def.goals.length, 1);

  const all = await s.listForPerson(ORG, MGR, PERSON, { includeArchived: true });
  assert.equal(all.promises.length, 1, "done promise visible with includeArchived");
});

test("update validates status against the item's kind and appends history", async () => {
  const s = svc();
  const req = await s.create(ORG, MGR, PERSON, { kind: "request", text: "a request" });
  await assert.rejects(() => s.update(ORG, MGR, req.id, { status: "done" }), /Invalid status/); // "done" isn't a request status
  const moved = await s.update(ORG, MGR, req.id, { status: "in_progress", note: "talked it through" });
  assert.equal(moved.status, "in_progress");
  assert.ok(moved.history.some((h) => h.text === "talked it through"));
});

test("update is person-fenced and org-fenced", async () => {
  const s = svc();
  const g = await s.create(ORG, MGR, PERSON, { kind: "goal", text: "a goal" });
  await assert.rejects(() => s.update(ORG, "other-mgr", g.id, { progress: 50 }), /not found/i);
  await assert.rejects(() => s.update("other-org", MGR, g.id, { progress: 50 }), /not found/i);
});

test("applyPromiseOutcomes maps chips → status and skips stale / non-open / unowned ids", async () => {
  const s = svc();
  const a = await s.create(ORG, MGR, PERSON, { kind: "promise", text: "p a", owner: "manager" });
  const b = await s.create(ORG, MGR, PERSON, { kind: "promise", text: "p b", owner: "member" });
  const goal = await s.create(ORG, MGR, PERSON, { kind: "goal", text: "not a promise" });

  const applied = await s.applyPromiseOutcomes(ORG, MGR, {
    [a.id]: "yes",       // → done
    [b.id]: "changed",   // → changed
    [goal.id]: "yes",    // ignored — not a promise
    "ghost-id": "no",    // ignored — doesn't exist
  });
  assert.equal(applied, 2);

  const all = await s.listForPerson(ORG, MGR, PERSON, { includeArchived: true });
  const byId = new Map(all.promises.map((p) => [p.id, p.status]));
  assert.equal(byId.get(a.id), "done");
  assert.equal(byId.get(b.id), "changed");
});
