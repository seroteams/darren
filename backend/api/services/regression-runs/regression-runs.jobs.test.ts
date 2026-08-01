import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BATCH_CEILING_USD, batchIdFrom, createRegressionJobsService } from "./regression-runs.jobs.ts";
import type { RegressionJobsDeps } from "./regression-runs.jobs.ts";
import { resetSlot, acquire } from "../engine-job-slot.ts";
import type { RegressionRunner } from "./regression-runs.runner.ts";

beforeEach(() => resetSlot());

const KNOWN = ["biweekly-priya", "leak-devon", "thin-sam"];

function grade(regressed: boolean) {
  return {
    caseId: "c",
    batchId: "b",
    expected: { verdict: "PASS", hard_fails: [] },
    actual: { verdict: regressed ? "FAIL" : "PASS", hard_fails: [], warnings: [] },
    newHardFails: [],
    regressed,
    answersRanOut: false,
  };
}

function deps(over: Partial<RegressionJobsDeps> = {}): RegressionJobsDeps {
  const runner: RegressionRunner = async ({ caseId }) => ({
    sessionId: `sess-${caseId}`,
    costUsd: 0.4,
    grade: grade(false),
  });
  return { knownCaseIds: () => KNOWN, hasApiKey: () => true, runner, now: () => 1_700_000_000_000, ...over };
}

/** Let the detached batch loop finish before asserting on it. */
const settle = () => new Promise((r) => setTimeout(r, 5));

test("current() is idle before any rerun", () => {
  const svc = createRegressionJobsService(deps());
  assert.equal(svc.current().status, "idle");
  assert.equal(svc.current().costUsd, 0);
});

test("no ids means the whole suite — that is the Rerun all button", async () => {
  const svc = createRegressionJobsService(deps());
  const out = await svc.start(undefined, null);
  assert.deepEqual(out.caseIds, KNOWN);
  await settle();
});

test("an unknown case is refused before anything is spent", async () => {
  const svc = createRegressionJobsService(deps());
  await assert.rejects(() => svc.start(["nope"], null), /unknown case: nope/);
  assert.equal(svc.current().status, "idle");
});

test("a missing API key is refused, and does not hold the slot", async () => {
  const svc = createRegressionJobsService(deps({ hasApiKey: () => false }));
  await assert.rejects(() => svc.start(["leak-devon"], null), /OPENAI_API_KEY/);
  // The slot must still be free for the other tool.
  assert.equal(acquire("test-engine"), null);
});

test("the Test engine holding the slot blocks a rerun, by name", async () => {
  acquire("test-engine");
  const svc = createRegressionJobsService(deps());
  await assert.rejects(() => svc.start(["leak-devon"], null), /Test engine is already running/);
});

test("the happy path: every case runs in order and the batch reports done", async () => {
  const seen: string[] = [];
  const svc = createRegressionJobsService(
    deps({
      runner: async ({ caseId }) => {
        seen.push(caseId);
        return { sessionId: `sess-${caseId}`, costUsd: 0.4, grade: grade(false) };
      },
    })
  );
  await svc.start(KNOWN, null);
  await settle();

  const job = svc.current();
  assert.deepEqual(seen, KNOWN);
  assert.equal(job.status, "done");
  assert.equal(job.outcomes.length, 3);
  assert.ok(Math.abs(job.costUsd - 1.2) < 1e-9);
  assert.equal(job.outcomes.every((o) => o.regressed === false), true);
});

test("one bad case does not kill the batch", async () => {
  const svc = createRegressionJobsService(
    deps({
      runner: async ({ caseId }) => {
        if (caseId === "leak-devon") throw new Error("engine exploded");
        return { sessionId: `sess-${caseId}`, costUsd: 0.4, grade: grade(false) };
      },
    })
  );
  await svc.start(KNOWN, null);
  await settle();

  const job = svc.current();
  assert.equal(job.status, "done");
  assert.equal(job.outcomes.length, 3);
  assert.match(String(job.outcomes[1]?.error), /engine exploded/);
  assert.equal(job.outcomes[2]?.sessionId, "sess-thin-sam"); // the batch carried on
});

test("the batch stops itself at the cost ceiling instead of finishing the list", async () => {
  const svc = createRegressionJobsService(
    deps({
      knownCaseIds: () => ["a", "b", "c", "d"],
      runner: async ({ caseId }) => ({ sessionId: `s-${caseId}`, costUsd: BATCH_CEILING_USD, grade: grade(false) }),
    })
  );
  await svc.start(["a", "b", "c", "d"], null);
  await settle();

  const job = svc.current();
  assert.equal(job.stoppedOnCeiling, true);
  assert.equal(job.outcomes.length, 1, "only the first case should have run");
});

test("progress names the case and its place in the batch", async () => {
  const svc = createRegressionJobsService(
    deps({
      runner: async ({ caseId }, hooks) => {
        hooks.onSession(`sess-${caseId}`);
        hooks.onProgress({ stageLabel: "Questions", turn: 4, total: 6 });
        return { sessionId: `sess-${caseId}`, costUsd: 0.4, grade: grade(true) };
      },
    })
  );
  await svc.start(["leak-devon"], null);
  await settle();

  const job = svc.current();
  assert.equal(job.caseId, "leak-devon");
  assert.equal(job.caseIndex, 1);
  assert.equal(job.caseTotal, 1);
  assert.equal(job.stageLabel, "Questions");
  assert.equal(job.turn, 4);
  assert.equal(job.total, 6);
  assert.equal(job.outcomes[0]?.regressed, true);
});

test("the slot is freed when the batch ends, so the Test engine can run again", async () => {
  const svc = createRegressionJobsService(deps());
  await svc.start(["leak-devon"], null);
  await settle();
  assert.equal(acquire("test-engine"), null);
});

test("current() hands back copies, so a caller cannot mutate live job state", async () => {
  const svc = createRegressionJobsService(deps());
  await svc.start(["leak-devon"], null);
  await settle();
  const snap = svc.current();
  snap.outcomes.push({ caseId: "fake", sessionId: null, costUsd: null, regressed: null, error: null });
  snap.caseIds.push("fake");
  assert.equal(svc.current().outcomes.length, 1);
  assert.equal(svc.current().caseIds.length, 1);
});

test("the batch id is readable and sorts by time", () => {
  const id = batchIdFrom(new Date(2026, 6, 31, 15, 12).getTime());
  assert.equal(id, "2026Jul31-1512");
});
