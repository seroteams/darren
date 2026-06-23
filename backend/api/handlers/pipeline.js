const fs = require("node:fs");
const path = require("node:path");
const {
  buildPipelineStatus,
  scanPipelineNow,
  readPipelineLockFromDir,
  manifestCounts,
} = require("../../engine/pipeline-lock");
const {
  findRunDir,
  findLatestRunWithLock,
  findLatestRun,
  buildHeadline,
} = require("../../engine/run-history");

function status(c) {
  const baselineParam = c.query.baseline || "latest";
  let baselineLock = null;
  let baselineRunId = null;
  let baselineHeadline = null;
  let baselineHasLock = false;

  if (baselineParam === "latest") {
    const withLock = findLatestRunWithLock();
    if (withLock) {
      baselineLock = withLock.lock;
      baselineRunId = withLock.id;
      baselineHeadline = withLock.headline;
      baselineHasLock = true;
    } else {
      const latest = findLatestRun();
      if (latest) {
        baselineLock = latest.lock;
        baselineRunId = latest.id;
        baselineHeadline = latest.headline;
        baselineHasLock = !!latest.lock;
      }
    }
  } else {
    const dir = findRunDir(baselineParam);
    if (dir) {
      baselineLock = readPipelineLockFromDir(dir);
      baselineRunId = baselineParam;
      baselineHasLock = !!baselineLock;
      try {
        const state = JSON.parse(
          fs.readFileSync(path.join(dir, "session-state.json"), "utf8")
        );
        baselineHeadline = buildHeadline(state.ctx || {});
      } catch {}
    }
  }

  const body = buildPipelineStatus({
    baselineLock,
    baselineRunId,
    baselineHeadline,
  });
  if (baselineRunId) {
    body.baseline.runId = baselineRunId;
    body.baseline.headline = baselineHeadline;
    body.baseline.hasLock = baselineHasLock;
  }
  c.json(200, body);
}

function manifest(c) {
  const current = scanPipelineNow();
  c.json(200, {
    capturedAt: current.capturedAt,
    aggregates: current.aggregates,
    manifestCounts: manifestCounts(),
  });
}

module.exports = { status, manifest };
