import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipelineService } from "./pipeline.service.ts";
import type { PipelineRepo } from "./pipeline.repo.ts";

// A fake repo lets us exercise the baseline-selection branching without disk.
function baseRepo(over: Partial<PipelineRepo>): PipelineRepo {
  return {
    latestWithLock: () => null,
    latest: () => null,
    findRunDir: () => null,
    readLock: () => null,
    readHeadline: () => null,
    scanNow: () => ({ capturedAt: 0, aggregates: {} }),
    manifestCounts: () => ({}),
    ...over,
  };
}

test("status('latest') picks the latest run that has a lock", () => {
  const repo = baseRepo({ latestWithLock: () => ({ id: "r1", headline: "H1", lock: null }) });
  const body = createPipelineService(repo).status("latest");
  assert.equal(body.baseline.runId, "r1");
  assert.equal(body.baseline.headline, "H1");
  assert.equal(body.baseline.hasLock, true);
});

test("status('latest') falls back to the latest run when none has a lock", () => {
  const repo = baseRepo({ latest: () => ({ id: "r2", headline: "H2", lock: null }) });
  const body = createPipelineService(repo).status("latest");
  assert.equal(body.baseline.runId, "r2");
  assert.equal(body.baseline.hasLock, false);
});

test("status(id) reads that run's dir, lock and headline", () => {
  const repo = baseRepo({
    findRunDir: (id) => (id === "r3" ? "/runs/r3" : null),
    readHeadline: () => "H3",
  });
  const body = createPipelineService(repo).status("r3");
  assert.equal(body.baseline.runId, "r3");
  assert.equal(body.baseline.headline, "H3");
  assert.equal(body.baseline.hasLock, false);
});

test("manifest passes the scan + counts straight through", () => {
  const repo = baseRepo({
    scanNow: () => ({ capturedAt: 42, aggregates: { a: 1 } }),
    manifestCounts: () => ({ n: 3 }),
  });
  assert.deepEqual(createPipelineService(repo).manifest(), {
    capturedAt: 42,
    aggregates: { a: 1 },
    manifestCounts: { n: 3 },
  });
});
