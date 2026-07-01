import { test } from "node:test";
import assert from "node:assert/strict";
import { createRunsService } from "./runs.service.ts";
import type { RunsRepo } from "./runs.repo.ts";
import { isObjectRecord, asRecord } from "../../../shared/guards.ts";

interface Calls {
  dropSession: string[];
  writeReview: Array<{ dir: string; data: unknown }>;
}

// A fake repo records its side-effects (dropSession, writeReview) and returns
// canned reads — proving the service logic (clamp/map, not-found gates, the
// review marks schema) is independent of run-history storage.
function fakeRepo(over: Partial<RunsRepo> = {}): { repo: RunsRepo; calls: Calls } {
  const calls: Calls = { dropSession: [], writeReview: [] };
  const repo: RunsRepo = {
    listRecent: () => [],
    listFinished: () => [],
    summarize: () => null,
    compare: () => null,
    readStages: () => null,
    deleteRun: (id) => ({ deleted: true, id }),
    dropSession: (id) => {
      calls.dropSession.push(id);
    },
    setArchived: (id, archived) => ({ ok: true, id, archived }),
    findRunDir: () => "/runs/r1",
    readReview: () => null,
    writeReview: (dir, data) => {
      calls.writeReview.push({ dir, data });
    },
    listFinishedForMember: () => [],
    memberRun: () => null,
    ...over,
  };
  return { repo, calls };
}

// Run fn and report the status + message of whatever it threw.
function thrown(fn: () => unknown): { status?: number; message?: string } {
  try {
    fn();
    return {};
  } catch (e) {
    if (!isObjectRecord(e)) return {};
    return {
      status: typeof e.status === "number" ? e.status : undefined,
      message: typeof e.message === "string" ? e.message : undefined,
    };
  }
}

test("recent clamps the limit (50->20, 0/undefined->3, -5->1, 7->7)", () => {
  const seen: unknown[] = [];
  const { repo } = fakeRepo({
    listRecent: (n) => {
      seen.push(n);
      return [];
    },
  });
  const svc = createRunsService(repo);
  svc.recent("50");
  svc.recent("0");
  svc.recent(undefined);
  svc.recent("-5");
  svc.recent("7");
  assert.deepEqual(seen, [20, 3, 3, 1, 7]);
});

test("recent maps only the six summary fields, dropping extras", () => {
  const { repo } = fakeRepo({
    listRecent: () => [
      { id: "r1", headline: "H", lastSeenAt: 5, stage: "done", pipelineDigest: "d", reviewStatus: "none", secret: "x" },
    ],
  });
  assert.deepEqual(createRunsService(repo).recent(undefined), {
    runs: [{ id: "r1", headline: "H", lastSeenAt: 5, stage: "done", pipelineDigest: "d", reviewStatus: "none" }],
  });
});

test("finished passes the repo list straight through", () => {
  const { repo } = fakeRepo({ listFinished: () => [{ id: "a" }, { id: "b" }] });
  assert.deepEqual(createRunsService(repo).finished(), { runs: [{ id: "a" }, { id: "b" }] });
});

test("myFinished forwards orgId+userId and wraps the member's own runs (member-nav Phase 2)", () => {
  const seen: Array<{ orgId?: string | null; userId?: string | null }> = [];
  const { repo } = fakeRepo({
    listFinishedForMember: (orgId, userId) => { seen.push({ orgId, userId }); return [{ id: "m1" }]; },
  });
  assert.deepEqual(createRunsService(repo).myFinished("org-A", "u1"), { runs: [{ id: "m1" }] });
  assert.deepEqual(seen, [{ orgId: "org-A", userId: "u1" }]);
});

test("myRun returns the member's own run, forwarding orgId+userId; 404 when not theirs/unknown", () => {
  const seen: Array<{ id: string; orgId?: string | null; userId?: string | null }> = [];
  const ok = fakeRepo({
    memberRun: (id, orgId, userId) => { seen.push({ id, orgId, userId }); return { id, briefing: {} }; },
  });
  assert.deepEqual(createRunsService(ok.repo).myRun("m1", "org-A", "u1"), { id: "m1", briefing: {} });
  assert.deepEqual(seen, [{ id: "m1", orgId: "org-A", userId: "u1" }]);
  // A run the member doesn't own (or unknown) → the repo returns null → 404.
  const miss = fakeRepo({ memberRun: () => null });
  assert.equal(thrown(() => createRunsService(miss.repo).myRun("m1", "org-A", "u2")).status, 404);
});

test("the caller's orgId is forwarded to every fenced repo read (the data wall)", () => {
  const seen: Array<string | null | undefined> = [];
  const record = (orgId?: string | null) => {
    seen.push(orgId);
    return undefined;
  };
  const { repo } = fakeRepo({
    listRecent: (_n, orgId) => { record(orgId); return []; },
    listFinished: (orgId) => { record(orgId); return []; },
    summarize: (_id, orgId) => { record(orgId); return { ok: true }; },
    compare: (_id, orgId) => { record(orgId); return { ok: true }; },
    readStages: (_id, orgId) => { record(orgId); return { ok: true }; },
    deleteRun: (id, orgId) => { record(orgId); return { deleted: true, id }; },
    setArchived: (id, _a, orgId) => { record(orgId); return { ok: true, id, archived: true }; },
  });
  const svc = createRunsService(repo);
  svc.recent(undefined, "org-A");
  svc.finished("org-A");
  svc.overview("r1", "org-A");
  svc.full("r1", "org-A");
  svc.stages("r1", "org-A");
  svc.remove("r1", "org-A");
  svc.archive("r1", { archived: true }, "org-A");
  assert.deepEqual(seen, ["org-A", "org-A", "org-A", "org-A", "org-A", "org-A", "org-A"]);
});

test("a fencing repo blocks cross-company reads: A sees only A's runs and can't open B's", () => {
  const ALL = [
    { id: "a1", orgId: "org-A", headline: "A", lastSeenAt: 2, stage: "done", pipelineDigest: null, reviewStatus: "none" },
    { id: "b1", orgId: "org-B", headline: "B", lastSeenAt: 1, stage: "done", pipelineDigest: null, reviewStatus: "none" },
  ];
  const fence = (orgId?: string | null) => (r: { orgId: string }) => !orgId || r.orgId === orgId;
  const { repo } = fakeRepo({
    listRecent: (_n, orgId) => ALL.filter(fence(orgId)),
    compare: (id, orgId) => ALL.find((r) => r.id === id && fence(orgId)(r)) ?? null,
  });
  const svc = createRunsService(repo);
  // Company A's recent list shows only A's run.
  assert.deepEqual(svc.recent(undefined, "org-A").runs.map((r) => asRecord(r).id), ["a1"]);
  // Company A cannot open company B's run by id — same answer as a stranger (404).
  assert.equal(thrown(() => svc.full("b1", "org-A")).status, 404);
  // …but A can open its own.
  assert.equal(asRecord(svc.full("a1", "org-A")).id, "a1");
});

test("overview returns the summary, or 404 when unknown", () => {
  const ok = fakeRepo({ summarize: () => ({ id: "r1", ok: true }) });
  assert.deepEqual(createRunsService(ok.repo).overview("r1"), { id: "r1", ok: true });
  const miss = fakeRepo({ summarize: () => null });
  assert.equal(thrown(() => createRunsService(miss.repo).overview("r1")).status, 404);
});

test("full returns the compare data, or 404 when unknown", () => {
  const ok = fakeRepo({ compare: () => ({ diff: 1 }) });
  assert.deepEqual(createRunsService(ok.repo).full("r1"), { diff: 1 });
  const miss = fakeRepo({ compare: () => null });
  assert.equal(thrown(() => createRunsService(miss.repo).full("r1")).status, 404);
});

test("stages wraps the data with the id, or 404 when unknown", () => {
  const ok = fakeRepo({ readStages: () => [{ stage: "prep" }] });
  assert.deepEqual(createRunsService(ok.repo).stages("r1"), { id: "r1", stages: [{ stage: "prep" }] });
  const miss = fakeRepo({ readStages: () => null });
  assert.equal(thrown(() => createRunsService(miss.repo).stages("r1")).status, 404);
});

test("del drops the session and returns {deleted,id} on success", () => {
  const { repo, calls } = fakeRepo({ deleteRun: (id) => ({ deleted: true, id }) });
  assert.deepEqual(createRunsService(repo).remove("r1"), { deleted: true, id: "r1" });
  assert.deepEqual(calls.dropSession, ["r1"]);
});

test("del returns 404 and does not drop the session when the run is unknown", () => {
  const { repo, calls } = fakeRepo({ deleteRun: (id) => ({ deleted: false, id }) });
  assert.equal(thrown(() => createRunsService(repo).remove("r1")).status, 404);
  assert.deepEqual(calls.dropSession, []);
});

test("archive coerces body.archived and returns the repo's archived flag", () => {
  const { repo } = fakeRepo({ setArchived: (id, archived) => ({ ok: true, id, archived }) });
  assert.deepEqual(createRunsService(repo).archive("r1", { archived: 1 }), { ok: true, id: "r1", archived: true });
  assert.deepEqual(createRunsService(repo).archive("r1", {}), { ok: true, id: "r1", archived: false });
});

test("archive returns 404 when the run is unknown", () => {
  const { repo } = fakeRepo({ setArchived: (id) => ({ ok: false, id }) });
  assert.equal(thrown(() => createRunsService(repo).archive("r1", {})).status, 404);
});

test("missing id is a 400 (id required), not a 404", () => {
  const { repo } = fakeRepo();
  assert.equal(thrown(() => createRunsService(repo).overview(undefined)).status, 400);
});

test("review normalises marks, caps the note, writes, and returns the badge inputs", () => {
  const { repo, calls } = fakeRepo({ readReview: () => null });
  const out = createRunsService(repo).review("r1", {
    marks: { role_aware: "pass", meeting_aware: "fail", grounded: "fail", bogus: "pass", trust: "weird" },
    overall: "fix",
    note: "x".repeat(5000),
  });
  assert.deepEqual(out, { ok: true, reviewStatus: "partial", overall: "fix", failedCount: 2 });
  const call = calls.writeReview[0];
  assert.ok(call);
  assert.equal(call.dir, "/runs/r1");
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

test("review drops an invalid overall to null and reports reviewStatus none for empty marks", () => {
  const { repo } = fakeRepo();
  const out = createRunsService(repo).review("r1", { marks: {}, overall: "maybe" });
  assert.deepEqual(out, { ok: true, reviewStatus: "none", overall: null, failedCount: 0 });
});

test("review preserves createdAt from an existing review", () => {
  const { repo, calls } = fakeRepo({ readReview: () => ({ createdAt: "2020-01-01T00:00:00.000Z" }) });
  createRunsService(repo).review("r1", { marks: {} });
  const call = calls.writeReview[0];
  assert.ok(call);
  assert.equal(asRecord(call.data).createdAt, "2020-01-01T00:00:00.000Z");
});

test("review returns 404 when the run dir is not found", () => {
  const { repo } = fakeRepo({ findRunDir: () => null });
  assert.equal(thrown(() => createRunsService(repo).review("r1", { marks: {} })).status, 404);
});

test("review rejects a non-object payload with 400", () => {
  const { repo } = fakeRepo();
  assert.equal(thrown(() => createRunsService(repo).review("r1", "nope")).status, 400);
});

test("review surfaces a write failure with status 500 and a clear message", () => {
  const { repo } = fakeRepo({
    writeReview: () => {
      throw new Error("boom");
    },
  });
  const r = thrown(() => createRunsService(repo).review("r1", { marks: {} }));
  assert.equal(r.status, 500);
  assert.match(r.message ?? "", /review write failed/);
});
