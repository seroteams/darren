import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBatches, createRegressionRunsService } from "./regression-runs.service.ts";
import type { RegressionRunsRepo, RerunRow, SuiteCase } from "./regression-runs.repo.ts";

function suiteCase(over: Partial<SuiteCase> = {}): SuiteCase {
  return {
    id: "leak-devon",
    name: "Devon",
    role: "Senior Engineer",
    seniority: "Senior",
    meetingType: "Growth & career plan",
    kind: "adversarial",
    expect: { verdict: "PASS", hard_fails: [] },
    note: "TRUST SENTINEL",
    answerCount: 9,
    scenarioPath: "content/scenarios/adversarial/private-worry.json",
    ...over,
  };
}

function fakeRepo(suite: SuiteCase[], reruns: RerunRow[] = []): RegressionRunsRepo {
  return { listSuite: () => suite, listReruns: async () => reruns, loadScenario: () => null, loadPreviousRun: async () => null };
}

test("list returns every suite case with lastRerun null when nothing has been rerun", async () => {
  const svc = createRegressionRunsService(fakeRepo([suiteCase()]), () => true);
  const out = await svc.list();

  assert.equal(out.cases.length, 1);
  const row = out.cases[0]!;
  assert.equal(row.id, "leak-devon");
  assert.equal(row.name, "Devon");
  assert.equal(row.meetingType, "Growth & career plan");
  assert.equal(row.kind, "adversarial");
  assert.deepEqual(row.expect, { verdict: "PASS", hard_fails: [] });
  assert.equal(row.lastRerun, null);
});

test("list attaches only this case's newest rerun", async () => {
  const reruns: RerunRow[] = [
    { caseId: "leak-devon", runId: "run-old", batchId: "b1", finishedAt: 1_600_000_000, grade: null, judge: null, review: null, cost: null },
    { caseId: "leak-devon", runId: "run-new", batchId: "b2", finishedAt: 1_700_000_000, grade: null, judge: null, review: null, cost: null },
    { caseId: "thin-sam", runId: "other", batchId: "b2", finishedAt: 1_700_000_500, grade: null, judge: null, review: null, cost: null },
  ];
  const svc = createRegressionRunsService(fakeRepo([suiteCase(), suiteCase({ id: "thin-sam", name: "Sam" })], reruns), () => true);
  const out = await svc.list();

  assert.equal(out.cases[0]!.lastRerun?.runId, "run-new");
  assert.equal(out.cases[1]!.lastRerun?.runId, "other");
});

test("canRerun comes from the injected policy, so live can switch paid reruns off", async () => {
  const repo = fakeRepo([suiteCase()]);
  assert.equal((await createRegressionRunsService(repo, () => true).list()).canRerun, true);
  assert.equal((await createRegressionRunsService(repo, () => false).list()).canRerun, false);
});

test("an empty suite yields an empty board rather than throwing", async () => {
  const out = await createRegressionRunsService(fakeRepo([]), () => true).list();
  assert.deepEqual(out.cases, []);
});

// --- batch history ----------------------------------------------------------

function rerunRow(over: Partial<RerunRow> = {}): RerunRow {
  return {
    caseId: "biweekly-priya",
    runId: "r1",
    batchId: "2026Aug01-1800",
    finishedAt: 1_700_000_000,
    grade: { actual: { verdict: "PASS" }, regressed: false },
    judge: null,
    review: null,
    cost: { usd: 0.11 },
    fingerprint: { promptVersion: "aaaa1111" },
    ...over,
  };
}

test("a batch counts its cases, its verdicts and what it cost", () => {
  const batches = buildBatches([
    rerunRow({ caseId: "a", runId: "r1" }),
    rerunRow({ caseId: "b", runId: "r2", grade: { actual: { verdict: "FAIL" }, regressed: true } }),
    rerunRow({ caseId: "c", runId: "r3", grade: null }),
  ]);

  assert.equal(batches.length, 1);
  assert.equal(batches[0]!.caseCount, 3);
  assert.equal(batches[0]!.ok, 1);
  assert.equal(batches[0]!.regressed, 1);
  assert.equal(batches[0]!.ungraded, 1);
  assert.ok(Math.abs(batches[0]!.costUsd - 0.33) < 1e-9);
});

test("batches come back newest first", () => {
  const batches = buildBatches([
    rerunRow({ batchId: "older", finishedAt: 1_000 }),
    rerunRow({ batchId: "newer", finishedAt: 9_000 }),
  ]);
  assert.deepEqual(batches.map((b) => b.batchId), ["newer", "older"]);
});

test("a batch whose prompts differ from the one before it is flagged", () => {
  const batches = buildBatches([
    rerunRow({ batchId: "newer", finishedAt: 9_000, fingerprint: { promptVersion: "bbbb2222" } }),
    rerunRow({ batchId: "older", finishedAt: 1_000, fingerprint: { promptVersion: "aaaa1111" } }),
  ]);
  assert.equal(batches[0]!.promptsChanged, true, "the newer batch ran on changed prompts");
  assert.equal(batches[1]!.promptsChanged, false, "the oldest batch has nothing to compare with");
});

test("identical prompts across batches are not flagged as a change", () => {
  const batches = buildBatches([
    rerunRow({ batchId: "newer", finishedAt: 9_000 }),
    rerunRow({ batchId: "older", finishedAt: 1_000 }),
  ]);
  assert.equal(batches[0]!.promptsChanged, false);
});

test("a missing prompt version never claims a change it cannot prove", () => {
  const batches = buildBatches([
    rerunRow({ batchId: "newer", finishedAt: 9_000, fingerprint: {} }),
    rerunRow({ batchId: "older", finishedAt: 1_000 }),
  ]);
  assert.equal(batches[0]!.promptsChanged, false);
  assert.equal(batches[0]!.promptVersion, null);
});

test("the board carries its batches alongside the cases", async () => {
  const svc = createRegressionRunsService(fakeRepo([suiteCase()], [rerunRow({ caseId: "leak-devon" })]), () => true);
  const out = await svc.list();
  assert.equal(out.batches.length, 1);
  assert.equal(out.batches[0]!.batchId, "2026Aug01-1800");
});
