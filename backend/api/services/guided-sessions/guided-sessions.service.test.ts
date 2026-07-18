import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuidedSessionsService } from "./guided-sessions.service.ts";
import type { GuidedPeopleGateway } from "./guided-sessions.service.ts";
import type { GuidedSessionsRepo, GuidedSessionRow } from "./guided-sessions.repo.ts";
import type { BlockScoresRepo, ScoreBlock } from "./block-scores.repo.ts";

function fakeBlockScores(): BlockScoresRepo & {
  rows: { guidedSessionId: string; personId: string; block: string; score: number; note: string | null }[];
} {
  const rows: { guidedSessionId: string; personId: string; block: string; score: number; note: string | null }[] = [];
  return {
    rows,
    async upsert(newRows) {
      for (const r of newRows) {
        const ex = rows.find((x) => x.guidedSessionId === r.guidedSessionId && x.block === r.block);
        if (ex) {
          ex.score = r.score;
          ex.note = r.note;
        } else {
          rows.push({ guidedSessionId: r.guidedSessionId, personId: r.personId, block: r.block, score: r.score, note: r.note });
        }
      }
    },
    async listForPerson(personId) {
      return rows
        .filter((r) => r.personId === personId)
        .map((r) => ({ ...r, block: r.block as ScoreBlock, createdAt: new Date() }));
    },
  };
}

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
    async listCompletedSlim() {
      return [];
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

function fakeTrackerGateway() {
  return {
    async applyOutcome() {
      return {};
    },
    async listForPerson() {
      return { promises: [], requests: [], goals: [] };
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
    /(not found|couldn.t find)/i,
  );
});

test("get is fenced — another manager's / org's / an unknown session is not found", async () => {
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA));
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  await assert.rejects(() => svc.get(gs.id, CALLER.orgId, "mgr-OTHER"), /(not found|couldn.t find)/i);
  await assert.rejects(() => svc.get(gs.id, "org-OTHER", CALLER.managerId), /(not found|couldn.t find)/i);
  await assert.rejects(() => svc.get("nope", CALLER.orgId, CALLER.managerId), /(not found|couldn.t find)/i);
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
    /(not found|couldn.t find)/i,
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
  await assert.rejects(() => svc.listForPerson("p1", CALLER.orgId, "mgr-OTHER"), /(not found|couldn.t find)/i);
});

test("complete applies the Catch-up promise outcomes to the tracker rows (Phase 2)", async () => {
  const applied: Array<{ id: string; outcome: string }> = [];
  const fakeTrackers = {
    async applyOutcome(id: string, _orgId: string, _managerId: string, outcome: string): Promise<unknown> {
      applied.push({ id, outcome });
      return {};
    },
    async listForPerson() {
      return { promises: [], requests: [], goals: [] };
    },
  };
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), fakeTrackers);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  await svc.patch(gs.id, CALLER.orgId, CALLER.managerId, {
    state: {
      v: 1,
      arc: "monthly_check_in",
      step: 0,
      visited: [0],
      catchup: { outcomes: { "promise-A": "yes", "promise-B": "changed" } },
    },
  });
  await svc.complete(gs.id, CALLER.orgId, CALLER.managerId);
  applied.sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(applied, [
    { id: "promise-A", outcome: "yes" },
    { id: "promise-B", outcome: "changed" },
  ]);
});

test("complete upserts the rated block scores; unrated blocks skipped; idempotent (Phase 3)", async () => {
  const bs = fakeBlockScores();
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), undefined, bs);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  await svc.patch(gs.id, CALLER.orgId, CALLER.managerId, {
    state: {
      v: 1,
      arc: "monthly_check_in",
      step: 2,
      visited: [0, 1, 2],
      rating: { scores: { tasks: 7.5, team: 8 }, blockNotes: { tasks: "up on last month" } },
    },
  });
  await svc.complete(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(bs.rows.length, 2); // only the 2 rated blocks
  const tasks = bs.rows.find((r) => r.block === "tasks");
  assert.equal(tasks?.score, 7.5);
  assert.equal(tasks?.note, "up on last month");
  await svc.complete(gs.id, CALLER.orgId, CALLER.managerId); // idempotent (already completed)
  assert.equal(bs.rows.length, 2);
});

test("complete rejects an out-of-range / off-step score — nothing written, session stays open", async () => {
  const bs = fakeBlockScores();
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), undefined, bs);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  for (const bad of [0, 11, 7.3]) {
    await svc.patch(gs.id, CALLER.orgId, CALLER.managerId, {
      state: { v: 1, arc: "monthly_check_in", step: 2, visited: [0], rating: { scores: { tasks: bad } } },
    });
    await assert.rejects(() => svc.complete(gs.id, CALLER.orgId, CALLER.managerId), /invalid score/i);
  }
  assert.equal(bs.rows.length, 0);
  const still = await svc.get(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(still.completedAt, null); // not completed — can still be fixed
});

test("listBlockScores is person-fenced and returns the history", async () => {
  const bs = fakeBlockScores();
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), undefined, bs);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  await svc.patch(gs.id, CALLER.orgId, CALLER.managerId, {
    state: { v: 1, arc: "monthly_check_in", step: 2, visited: [0], rating: { scores: { fun: 6 } } },
  });
  await svc.complete(gs.id, CALLER.orgId, CALLER.managerId);
  const { scores } = await svc.listBlockScores("p1", CALLER.orgId, CALLER.managerId);
  assert.equal(scores.length, 1);
  assert.equal(scores[0]?.block, "fun");
  assert.equal(scores[0]?.score, 6);
  await assert.rejects(() => svc.listBlockScores("p1", CALLER.orgId, "mgr-OTHER"), /(not found|couldn.t find)/i);
});

test("wrapupDraft calls the AI boundary and returns the draft (Phase 5)", async () => {
  let called = 0;
  const fakeWrapup = async () => {
    called++;
    return {
      summary: { headline: "Good month", bullets: ["Development up 5→7"] },
      suggestions: { individual: ["give a stretch task"], team: [], company: [] },
      runId: "r1",
    };
  };
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), fakeTrackerGateway(), fakeBlockScores(), fakeWrapup);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  const res = await svc.wrapupDraft(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(called, 1);
  assert.equal(res.cached, false);
  assert.equal(res.summary?.headline, "Good month");
  assert.equal(res.suggestions?.individual[0], "give a stretch task");
});

test("wrapupDraft caches (no double spend) and regenerate bypasses it", async () => {
  let called = 0;
  const fakeWrapup = async () => {
    called++;
    return { summary: { headline: "Fresh", bullets: [] }, suggestions: { individual: [], team: [], company: [] }, runId: "r" };
  };
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), fakeTrackerGateway(), fakeBlockScores(), fakeWrapup);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  // the client persists a draft into state → the next visit must NOT re-spend
  await svc.patch(gs.id, CALLER.orgId, CALLER.managerId, {
    state: { v: 1, arc: "monthly_check_in", step: 5, visited: [0], summary: { draft: { headline: "Cached", bullets: ["x"] } } },
  });
  const cached = await svc.wrapupDraft(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(called, 0);
  assert.equal(cached.cached, true);
  assert.equal(cached.summary?.headline, "Cached");
  const regen = await svc.wrapupDraft(gs.id, CALLER.orgId, CALLER.managerId, { regenerate: true });
  assert.equal(called, 1);
  assert.equal(regen.cached, false);
  assert.equal(regen.summary?.headline, "Fresh");
});

test("wrapupDraft surfaces an honest failure (no hidden rewrite)", async () => {
  const fakeWrapup = async () => ({ summary: null, suggestions: null, error: "couldn't draft this", runId: "r" });
  const svc = createGuidedSessionsService(fakeRepo(), fakePeople(AISHA), fakeTrackerGateway(), fakeBlockScores(), fakeWrapup);
  const gs = await svc.create(CALLER.orgId, CALLER.managerId, { personId: "p1" });
  const res = await svc.wrapupDraft(gs.id, CALLER.orgId, CALLER.managerId);
  assert.equal(res.summary, null);
  assert.equal(res.error, "couldn't draft this");
});
