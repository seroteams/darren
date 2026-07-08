import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipelineService } from "./pipeline.service.ts";
import type { PipelineRepo } from "./pipeline.repo.ts";

// A fake repo lets us exercise the baseline-selection branching without storage.
function baseRepo(over: Partial<PipelineRepo>): PipelineRepo {
  return {
    latestWithLock: async () => null,
    latest: async () => null,
    baselineById: async () => null,
    ...over,
  };
}

test("status('latest') picks the latest run that has a lock", async () => {
  const repo = baseRepo({ latestWithLock: async () => ({ id: "r1", headline: "H1", lock: null }) });
  const body = await createPipelineService(repo).status("latest");
  assert.equal(body.baseline.runId, "r1");
  assert.equal(body.baseline.headline, "H1");
  assert.equal(body.baseline.hasLock, true);
});

test("status('latest') falls back to the latest run when none has a lock", async () => {
  const repo = baseRepo({ latest: async () => ({ id: "r2", headline: "H2", lock: null }) });
  const body = await createPipelineService(repo).status("latest");
  assert.equal(body.baseline.runId, "r2");
  assert.equal(body.baseline.hasLock, false);
});

test("status(id) reads that run's lock and headline", async () => {
  const repo = baseRepo({
    baselineById: async (id) => (id === "r3" ? { lock: null, headline: "H3" } : null),
  });
  const body = await createPipelineService(repo).status("r3");
  assert.equal(body.baseline.runId, "r3");
  assert.equal(body.baseline.headline, "H3");
  assert.equal(body.baseline.hasLock, false);
});
