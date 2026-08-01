import { test } from "node:test";
import assert from "node:assert/strict";
import { createRegressionRunsService } from "./regression-runs.service.ts";
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
  return { listSuite: () => suite, listReruns: async () => reruns, loadScenario: () => null };
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
