import fs from "node:fs";
import path from "node:path";
import {
  buildPipelineStatus,
  scanPipelineNow,
  readPipelineLockFromDir,
  manifestCounts,
} from "../../engine/pipeline-lock.ts";
import {
  findRunDir,
  findLatestRunWithLock,
  findLatestRun,
  buildHeadline,
} from "../../engine/run-history.ts";
import type { RequestContext } from "../router.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

// PipelineLock isn't exported from pipeline-lock; pull it off a return type.
type PipelineLock = ReturnType<typeof readPipelineLockFromDir>;

function status(c: RequestContext): void {
  const baselineParam = c.query.baseline || "latest";
  let baselineLock: PipelineLock = null;
  let baselineRunId: string | null = null;
  let baselineHeadline: string | null = null;
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
        const state: unknown = JSON.parse(
          fs.readFileSync(path.join(dir, "session-state.json"), "utf8")
        );
        baselineHeadline = buildHeadline(asRecord(isObjectRecord(state) ? state.ctx : {}));
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

function manifest(c: RequestContext): void {
  const current = scanPipelineNow();
  c.json(200, {
    capturedAt: current.capturedAt,
    aggregates: current.aggregates,
    manifestCounts: manifestCounts(),
  });
}

export { status, manifest };
