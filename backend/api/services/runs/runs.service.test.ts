import { test } from "node:test";
import assert from "node:assert/strict";
import { createRunsService } from "./runs.service.ts";
import type { RunsRepo } from "./runs.repo.ts";
import { isObjectRecord, asRecord } from "../../../shared/guards.ts";

interface Calls {
  dropSession: string[];
  writeReview: Array<{ id: string; data: unknown }>;
  writeRating: Array<{ id: string; data: unknown }>;
}

// A fake repo records its side-effects (dropSession, writeReview) and returns
// canned reads — proving the service logic (clamp/map, not-found gates, the
// review marks schema) is independent of storage (file or Postgres).
function fakeRepo(over: Partial<RunsRepo> = {}): { repo: RunsRepo; calls: Calls } {
  const calls: Calls = { dropSession: [], writeReview: [], writeRating: [] };
  const repo: RunsRepo = {
    listRecent: async () => [],
    listFinished: async () => [],
    summarize: async () => null,
    compare: async () => null,
    readStages: async () => null,
    deleteRun: async (id) => ({ deleted: true, id }),
    dropSession: (id) => {
      calls.dropSession.push(id);
    },
    setArchived: async (id, archived) => ({ ok: true, id, archived }),
    runExists: async () => true,
    readReview: async () => null,
    writeReview: async (id, _orgId, data) => {
      calls.writeReview.push({ id, data });
    },
    listFinishedForMember: async () => [],
    listAboutPerson: async () => [],
    memberRun: async () => null,
    cloneRun: async (_sourceId, _orgId, _userId) => ({ id: "clone-1" }),
    readRating: async () => null,
    writeRating: async (id, _orgId, data) => {
      calls.writeRating.push({ id, data });
    },
    ...over,
  };
  return { repo, calls };
}

// Run fn and report the status + message of whatever it rejected with.
async function thrown(fn: () => Promise<unknown>): Promise<{ status?: number; message?: string }> {
  try {
    await fn();
    return {};
  } catch (e) {
    if (!isObjectRecord(e)) return {};
    return {
      status: typeof e.status === "number" ? e.status : undefined,
      message: typeof e.message === "string" ? e.message : undefined,
    };
  }
}

test("recent clamps the limit (50->20, 0/undefined->3, -5->1, 7->7)", async () => {
  const seen: unknown[] = [];
  const { repo } = fakeRepo({
    listRecent: async (n) => {
      seen.push(n);
      return [];
    },
  });
  const svc = createRunsService(repo);
  await svc.recent("50");
  await svc.recent("0");
  await svc.recent(undefined);
  await svc.recent("-5");
  await svc.recent("7");
  assert.deepEqual(seen, [20, 3, 3, 1, 7]);
});

test("recent maps only the six summary fields, dropping extras", async () => {
  const { repo } = fakeRepo({
    listRecent: async () => [
      { id: "r1", headline: "H", lastSeenAt: 5, stage: "done", pipelineDigest: "d", reviewStatus: "none", secret: "x" },
    ],
  });
  assert.deepEqual(await createRunsService(repo).recent(undefined), {
    runs: [{ id: "r1", headline: "H", lastSeenAt: 5, stage: "done", pipelineDigest: "d", reviewStatus: "none" }],
  });
});

test("finished passes the repo list straight through", async () => {
  const { repo } = fakeRepo({ listFinished: async () => [{ id: "a" }, { id: "b" }] });
  assert.deepEqual(await createRunsService(repo).finished(), { runs: [{ id: "a" }, { id: "b" }] });
});

test("myFinished forwards orgId+userId and wraps the member's own runs (member-nav Phase 2)", async () => {
  const seen: Array<{ orgId?: string | null; userId?: string | null }> = [];
  const { repo } = fakeRepo({
    listFinishedForMember: async (orgId, userId) => { seen.push({ orgId, userId }); return [{ id: "m1" }]; },
  });
  assert.deepEqual(await createRunsService(repo).myFinished("org-A", "u1"), { runs: [{ id: "m1" }] });
  assert.deepEqual(seen, [{ orgId: "org-A", userId: "u1" }]);
});

test("aboutMe forwards org + person ids and stamps the manager's display name (people-roster Phase 5)", async () => {
  const seen: Array<{ orgId?: string | null; personIds?: string[] }> = [];
  const { repo } = fakeRepo({
    listAboutPerson: async (orgId, personIds) => {
      seen.push({ orgId, personIds });
      return [{ id: "r1", meetingType: "One-on-one", lastSeenAt: 5, completedAt: 5, managerId: "mgr-1" }];
    },
  });
  const out = await createRunsService(repo).aboutMe("org-A", ["p1", "p2"], { "mgr-1": "Carl" });
  assert.deepEqual(out, {
    runs: [{ id: "r1", meetingType: "One-on-one", lastSeenAt: 5, completedAt: 5, managerName: "Carl" }],
  });
  assert.deepEqual(seen, [{ orgId: "org-A", personIds: ["p1", "p2"] }]);
});

test("aboutMe with no linked people returns an empty list without touching the repo", async () => {
  let called = 0;
  const { repo } = fakeRepo({ listAboutPerson: async () => { called++; return []; } });
  assert.deepEqual(await createRunsService(repo).aboutMe("org-A", [], {}), { runs: [] });
  assert.equal(called, 0);
});

test("aboutMe never leaks extra fields — an over-sharing repo row is cut to the minimal shape", async () => {
  const { repo } = fakeRepo({
    listAboutPerson: async () => [
      { id: "r1", meetingType: "1:1", lastSeenAt: 1, completedAt: null, managerId: "m", notes: "SECRET", briefing: { x: 1 }, ctx: { name: "P" } },
    ],
  });
  const out = await createRunsService(repo).aboutMe("org-A", ["p1"], {});
  assert.deepEqual(Object.keys(out.runs[0] as Record<string, unknown>).sort(), ["completedAt", "id", "lastSeenAt", "managerName", "meetingType"]);
});

test("myFinished passes includeOpen through only for the literal query value \"1\"", async () => {
  const seen: unknown[] = [];
  const { repo } = fakeRepo({
    listFinishedForMember: async (_orgId, _userId, includeOpen) => { seen.push(includeOpen); return []; },
  });
  const svc = createRunsService(repo);
  await svc.myFinished("org-A", "u1", "1");
  await svc.myFinished("org-A", "u1", undefined);
  await svc.myFinished("org-A", "u1", "true");
  assert.deepEqual(seen, [true, false, false]);
});

test("myRun returns the member's own run, forwarding orgId+userId; 404 when not theirs/unknown", async () => {
  const seen: Array<{ id: string; orgId?: string | null; userId?: string | null }> = [];
  const ok = fakeRepo({
    memberRun: async (id, orgId, userId) => { seen.push({ id, orgId, userId }); return { id, briefing: {} }; },
  });
  assert.deepEqual(await createRunsService(ok.repo).myRun("m1", "org-A", "u1"), { id: "m1", briefing: {} });
  assert.deepEqual(seen, [{ id: "m1", orgId: "org-A", userId: "u1" }]);
  // A run the member doesn't own (or unknown) → the repo returns null → 404.
  const miss = fakeRepo({ memberRun: async () => null });
  assert.equal((await thrown(() => createRunsService(miss.repo).myRun("m1", "org-A", "u2"))).status, 404);
});

test("the caller's orgId is forwarded to every fenced repo read (the data wall)", async () => {
  const seen: Array<string | null | undefined> = [];
  const record = (orgId?: string | null) => {
    seen.push(orgId);
    return undefined;
  };
  const { repo } = fakeRepo({
    listRecent: async (_n, orgId) => { record(orgId); return []; },
    listFinished: async (orgId) => { record(orgId); return []; },
    summarize: async (_id, orgId) => { record(orgId); return { ok: true }; },
    compare: async (_id, orgId) => { record(orgId); return { ok: true }; },
    readStages: async (_id, orgId) => { record(orgId); return { ok: true }; },
    deleteRun: async (id, orgId) => { record(orgId); return { deleted: true, id }; },
    setArchived: async (id, _a, orgId) => { record(orgId); return { ok: true, id, archived: true }; },
  });
  const svc = createRunsService(repo);
  await svc.recent(undefined, "org-A");
  await svc.finished("org-A");
  await svc.overview("r1", "org-A");
  await svc.full("r1", "org-A");
  await svc.stages("r1", "org-A");
  await svc.remove("r1", "org-A");
  await svc.archive("r1", { archived: true }, "org-A");
  assert.deepEqual(seen, ["org-A", "org-A", "org-A", "org-A", "org-A", "org-A", "org-A"]);
});

test("the caller's userId fence is forwarded to every admin repo read (manager privacy wall)", async () => {
  const seen: Array<string | null | undefined> = [];
  const record = (userId?: string | null) => {
    seen.push(userId);
    return undefined;
  };
  const { repo } = fakeRepo({
    listRecent: async (_n, _orgId, userId) => { record(userId); return []; },
    listFinished: async (_orgId, userId) => { record(userId); return []; },
    summarize: async (_id, _orgId, userId) => { record(userId); return { ok: true }; },
    compare: async (_id, _orgId, userId) => { record(userId); return { ok: true }; },
    readStages: async (_id, _orgId, userId) => { record(userId); return { ok: true }; },
    deleteRun: async (id, _orgId, userId) => { record(userId); return { deleted: true, id }; },
    setArchived: async (id, _a, _orgId, userId) => { record(userId); return { ok: true, id, archived: true }; },
    runExists: async (_id, _orgId, userId) => { record(userId); return true; },
  });
  const svc = createRunsService(repo);
  await svc.recent(undefined, "org-A", "mgr-1");
  await svc.finished("org-A", "mgr-1");
  await svc.overview("r1", "org-A", "mgr-1");
  await svc.full("r1", "org-A", "mgr-1");
  await svc.stages("r1", "org-A", "mgr-1");
  await svc.remove("r1", "org-A", "mgr-1");
  await svc.archive("r1", { archived: true }, "org-A", "mgr-1");
  await svc.review("r1", { marks: {} }, "org-A", "mgr-1");
  assert.deepEqual(seen, ["mgr-1", "mgr-1", "mgr-1", "mgr-1", "mgr-1", "mgr-1", "mgr-1", "mgr-1"]);
});

test("a fencing repo blocks a colleague manager's run: fenced list shows own only, by-id answers 404", async () => {
  const ALL = [
    { id: "mine", userId: "mgr-1", headline: "M", lastSeenAt: 2, stage: "done", pipelineDigest: null, reviewStatus: "none" },
    { id: "theirs", userId: "mgr-2", headline: "T", lastSeenAt: 1, stage: "done", pipelineDigest: null, reviewStatus: "none" },
  ];
  const fence = (userId?: string | null) => (r: { userId: string }) => !userId || r.userId === userId;
  const { repo } = fakeRepo({
    listRecent: async (_n, _orgId, userId) => ALL.filter(fence(userId)),
    compare: async (id, _orgId, userId) => ALL.find((r) => r.id === id && fence(userId)(r)) ?? null,
  });
  const svc = createRunsService(repo);
  assert.deepEqual((await svc.recent(undefined, "org-A", "mgr-1")).runs.map((r) => asRecord(r).id), ["mine"]);
  assert.equal((await thrown(() => svc.full("theirs", "org-A", "mgr-1"))).status, 404, "a colleague's run answers unknown");
  assert.equal(asRecord(await svc.full("mine", "org-A", "mgr-1")).id, "mine");
  // The internal-admin view (null userId) still sees the whole org.
  assert.deepEqual((await svc.recent(undefined, "org-A", null)).runs.map((r) => asRecord(r).id), ["mine", "theirs"]);
});

test("a fencing repo blocks cross-company reads: A sees only A's runs and can't open B's", async () => {
  const ALL = [
    { id: "a1", orgId: "org-A", headline: "A", lastSeenAt: 2, stage: "done", pipelineDigest: null, reviewStatus: "none" },
    { id: "b1", orgId: "org-B", headline: "B", lastSeenAt: 1, stage: "done", pipelineDigest: null, reviewStatus: "none" },
  ];
  const fence = (orgId?: string | null) => (r: { orgId: string }) => !orgId || r.orgId === orgId;
  const { repo } = fakeRepo({
    listRecent: async (_n, orgId) => ALL.filter(fence(orgId)),
    compare: async (id, orgId) => ALL.find((r) => r.id === id && fence(orgId)(r)) ?? null,
  });
  const svc = createRunsService(repo);
  // Company A's recent list shows only A's run.
  assert.deepEqual((await svc.recent(undefined, "org-A")).runs.map((r) => asRecord(r).id), ["a1"]);
  // Company A cannot open company B's run by id — same answer as a stranger (404).
  assert.equal((await thrown(() => svc.full("b1", "org-A"))).status, 404);
  // …but A can open its own.
  assert.equal(asRecord(await svc.full("a1", "org-A")).id, "a1");
});

test("overview returns the summary, or 404 when unknown", async () => {
  const ok = fakeRepo({ summarize: async () => ({ id: "r1", ok: true }) });
  assert.deepEqual(await createRunsService(ok.repo).overview("r1"), { id: "r1", ok: true });
  const miss = fakeRepo({ summarize: async () => null });
  assert.equal((await thrown(() => createRunsService(miss.repo).overview("r1"))).status, 404);
});

test("full returns the compare data, or 404 when unknown", async () => {
  const ok = fakeRepo({ compare: async () => ({ diff: 1 }) });
  assert.deepEqual(await createRunsService(ok.repo).full("r1"), { diff: 1 });
  const miss = fakeRepo({ compare: async () => null });
  assert.equal((await thrown(() => createRunsService(miss.repo).full("r1"))).status, 404);
});

test("stages wraps the data with the id, or 404 when unknown", async () => {
  const ok = fakeRepo({ readStages: async () => [{ stage: "prep" }] });
  assert.deepEqual(await createRunsService(ok.repo).stages("r1"), { id: "r1", stages: [{ stage: "prep" }] });
  const miss = fakeRepo({ readStages: async () => null });
  assert.equal((await thrown(() => createRunsService(miss.repo).stages("r1"))).status, 404);
});

test("del drops the session and returns {deleted,id} on success", async () => {
  const { repo, calls } = fakeRepo({ deleteRun: async (id) => ({ deleted: true, id }) });
  assert.deepEqual(await createRunsService(repo).remove("r1"), { deleted: true, id: "r1" });
  assert.deepEqual(calls.dropSession, ["r1"]);
});

test("del returns 404 and does not drop the session when the run is unknown", async () => {
  const { repo, calls } = fakeRepo({ deleteRun: async (id) => ({ deleted: false, id }) });
  assert.equal((await thrown(() => createRunsService(repo).remove("r1"))).status, 404);
  assert.deepEqual(calls.dropSession, []);
});

test("archive coerces body.archived and returns the repo's archived flag", async () => {
  const { repo } = fakeRepo({ setArchived: async (id, archived) => ({ ok: true, id, archived }) });
  assert.deepEqual(await createRunsService(repo).archive("r1", { archived: 1 }), { ok: true, id: "r1", archived: true });
  assert.deepEqual(await createRunsService(repo).archive("r1", {}), { ok: true, id: "r1", archived: false });
});

test("archive returns 404 when the run is unknown", async () => {
  const { repo } = fakeRepo({ setArchived: async (id) => ({ ok: false, id }) });
  assert.equal((await thrown(() => createRunsService(repo).archive("r1", {}))).status, 404);
});

test("missing id is a 400 (id required), not a 404", async () => {
  const { repo } = fakeRepo();
  assert.equal((await thrown(() => createRunsService(repo).overview(undefined))).status, 400);
});

test("review normalises marks, caps the note, writes, and returns the badge inputs", async () => {
  const { repo, calls } = fakeRepo({ readReview: async () => null });
  const out = await createRunsService(repo).review("r1", {
    marks: { role_aware: "pass", meeting_aware: "fail", grounded: "fail", bogus: "pass", trust: "weird" },
    overall: "fix",
    note: "x".repeat(5000),
  });
  assert.deepEqual(out, { ok: true, reviewStatus: "partial", overall: "fix", failedCount: 2 });
  const call = calls.writeReview[0];
  assert.ok(call);
  assert.equal(call.id, "r1");
  const rec = asRecord(call.data);
  assert.deepEqual(rec.marks, {
    role_aware: "pass",
    meeting_aware: "fail",
    grounded: "fail",
    evidence: null,
    no_overreach: null,
    trust: null,
    next_actions: null,
    briefing_usable: null,
  });
  assert.equal(rec.version, 1);
  assert.equal(rec.runId, "r1");
  assert.equal(rec.reviewer, "carl");
  assert.equal(rec.overall, "fix");
  assert.equal(rec.note, "x".repeat(4000));
  assert.equal(typeof rec.createdAt, "string");
  assert.equal(typeof rec.updatedAt, "string");
});

test("review drops an invalid overall to null and reports reviewStatus none for empty marks", async () => {
  const { repo } = fakeRepo();
  const out = await createRunsService(repo).review("r1", { marks: {}, overall: "maybe" });
  assert.deepEqual(out, { ok: true, reviewStatus: "none", overall: null, failedCount: 0 });
});

test("review preserves createdAt from an existing review", async () => {
  const { repo, calls } = fakeRepo({ readReview: async () => ({ createdAt: "2020-01-01T00:00:00.000Z" }) });
  await createRunsService(repo).review("r1", { marks: {} });
  const call = calls.writeReview[0];
  assert.ok(call);
  assert.equal(asRecord(call.data).createdAt, "2020-01-01T00:00:00.000Z");
});

test("review returns 404 when the run is unknown", async () => {
  const { repo } = fakeRepo({ runExists: async () => false });
  assert.equal((await thrown(() => createRunsService(repo).review("r1", { marks: {} }))).status, 404);
});

test("review rejects a non-object payload with 400", async () => {
  const { repo } = fakeRepo();
  assert.equal((await thrown(() => createRunsService(repo).review("r1", "nope"))).status, 400);
});

test("clonable returns every finished run unfenced (the dev prefill picker source)", async () => {
  const seen: Array<string | null | undefined> = [];
  const { repo } = fakeRepo({
    listFinished: async (orgId) => { seen.push(orgId); return [{ id: "a" }, { id: "b" }]; },
  });
  assert.deepEqual(await createRunsService(repo).clonable(), { runs: [{ id: "a" }, { id: "b" }] });
  assert.deepEqual(seen, [null]); // unfenced: null orgId, so the picker always has sources
});

test("clone forwards sourceId + caller owner and returns the new run id", async () => {
  const seen: Array<{ sourceId: string; orgId: string | null; userId: string | null }> = [];
  const { repo } = fakeRepo({
    cloneRun: async (sourceId, orgId, userId) => { seen.push({ sourceId, orgId, userId }); return { id: "new-run" }; },
  });
  assert.deepEqual(await createRunsService(repo).clone("src-1", "dev-org", "dev-user"), { id: "new-run" });
  assert.deepEqual(seen, [{ sourceId: "src-1", orgId: "dev-org", userId: "dev-user" }]);
});

test("clone is 400 when sourceId is missing, 404 when the source is unknown/not finished", async () => {
  const { repo } = fakeRepo();
  assert.equal((await thrown(() => createRunsService(repo).clone(undefined, "o", "u"))).status, 400);
  const miss = fakeRepo({ cloneRun: async () => null });
  assert.equal((await thrown(() => createRunsService(miss.repo).clone("src-1", "o", "u"))).status, 404);
});

test("rateMine writes a 1-5 star rating + trimmed note for the caller's own run", async () => {
  const { repo, calls } = fakeRepo({
    memberRun: async (id) => ({ id, briefing: {} }), // caller owns it
  });
  const out = await createRunsService(repo).rateMine("r1", { stars: 4, note: "  useful, a bit generic  " }, "org-A", "u1");
  assert.deepEqual(out, { ok: true, stars: 4, note: "useful, a bit generic" });
  const call = calls.writeRating[0];
  assert.ok(call);
  assert.equal(call.id, "r1");
  const rec = asRecord(call.data);
  assert.equal(rec.version, 1);
  assert.equal(rec.runId, "r1");
  assert.equal(rec.stars, 4);
  assert.equal(rec.note, "useful, a bit generic");
  assert.equal(rec.ratedBy, "u1");
  assert.equal(typeof rec.createdAt, "string");
  assert.equal(typeof rec.updatedAt, "string");
});

test("rateMine caps the note at 4000 chars and preserves createdAt from a prior rating", async () => {
  const { repo, calls } = fakeRepo({
    memberRun: async (id) => ({ id }),
    readRating: async () => ({ createdAt: "2020-01-01T00:00:00.000Z" }),
  });
  await createRunsService(repo).rateMine("r1", { stars: 5, note: "x".repeat(5000) }, "org-A", "u1");
  const rec = asRecord(calls.writeRating[0]?.data);
  assert.equal(rec.note, "x".repeat(4000));
  assert.equal(rec.createdAt, "2020-01-01T00:00:00.000Z");
});

test("rateMine rejects out-of-range / non-integer stars with 400 (and writes nothing)", async () => {
  const mk = () => fakeRepo({ memberRun: async (id) => ({ id }) });
  for (const bad of [0, 6, 2.5, -1, "3", null]) {
    const { repo, calls } = mk();
    assert.equal((await thrown(() => createRunsService(repo).rateMine("r1", { stars: bad }, "o", "u"))).status, 400);
    assert.deepEqual(calls.writeRating, []);
  }
});

test("rateMine is 404 for a run the caller doesn't own (or unknown) — no probing", async () => {
  const { repo, calls } = fakeRepo({ memberRun: async () => null }); // not theirs
  assert.equal((await thrown(() => createRunsService(repo).rateMine("r1", { stars: 4 }, "org-A", "u2"))).status, 404);
  assert.deepEqual(calls.writeRating, []);
});

test("rateMine surfaces a write failure with status 500 and a clear message", async () => {
  const { repo } = fakeRepo({
    memberRun: async (id) => ({ id }),
    writeRating: async () => {
      throw new Error("boom");
    },
  });
  const r = await thrown(() => createRunsService(repo).rateMine("r1", { stars: 4 }, "o", "u"));
  assert.equal(r.status, 500);
  assert.match(r.message ?? "", /rating write failed/);
});

test("review surfaces a write failure with status 500 and a clear message", async () => {
  const { repo } = fakeRepo({
    writeReview: async () => {
      throw new Error("boom");
    },
  });
  const r = await thrown(() => createRunsService(repo).review("r1", { marks: {} }));
  assert.equal(r.status, 500);
  assert.match(r.message ?? "", /review write failed/);
});
