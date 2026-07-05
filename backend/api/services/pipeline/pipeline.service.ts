// Pipeline status logic: choose the baseline run (latest-with-lock → latest →
// a specific id), build the status body, patch in the baseline summary. Never
// touches req/res or the filesystem — all disk access goes through the repo.

import { buildPipelineStatus } from "../../../engine/pipeline-lock.ts";
import type { PipelineRepo, PipelineLock } from "./pipeline.repo.ts";

export interface PipelineService {
  status(baselineParam: string): ReturnType<typeof buildPipelineStatus>;
}

export function createPipelineService(repo: PipelineRepo): PipelineService {
  return {
    status(baselineParam) {
      let baselineLock: PipelineLock = null;
      let baselineRunId: string | null = null;
      let baselineHeadline: string | null = null;
      let baselineHasLock = false;

      if (baselineParam === "latest") {
        const withLock = repo.latestWithLock();
        if (withLock) {
          baselineLock = withLock.lock;
          baselineRunId = withLock.id;
          baselineHeadline = withLock.headline;
          baselineHasLock = true;
        } else {
          const latest = repo.latest();
          if (latest) {
            baselineLock = latest.lock;
            baselineRunId = latest.id;
            baselineHeadline = latest.headline;
            baselineHasLock = !!latest.lock;
          }
        }
      } else {
        const dir = repo.findRunDir(baselineParam);
        if (dir) {
          baselineLock = repo.readLock(dir);
          baselineRunId = baselineParam;
          baselineHasLock = !!baselineLock;
          baselineHeadline = repo.readHeadline(dir);
        }
      }

      const body = buildPipelineStatus({ baselineLock, baselineRunId, baselineHeadline });
      if (baselineRunId) {
        body.baseline.runId = baselineRunId;
        body.baseline.headline = baselineHeadline;
        body.baseline.hasLock = baselineHasLock;
      }
      return body;
    },
  };
}
