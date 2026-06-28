// Data access for pipeline status — run lookups, lock reads, the on-disk scan.
// Wraps the run-history + pipeline-lock engine reads behind one interface so the
// service's baseline-selection logic never touches the filesystem directly.

import fs from "node:fs";
import path from "node:path";
import {
  scanPipelineNow,
  readPipelineLockFromDir,
  manifestCounts,
} from "../../../engine/pipeline-lock.ts";
import {
  findRunDir,
  findLatestRunWithLock,
  findLatestRun,
  buildHeadline,
} from "../../../engine/run-history.ts";
import { isObjectRecord, asRecord } from "../../../shared/guards.ts";

// PipelineLock isn't exported from pipeline-lock — pull it off the return type.
export type PipelineLock = ReturnType<typeof readPipelineLockFromDir>;

export interface BaselineRun {
  id: string;
  headline: string;
  lock: PipelineLock;
}

export interface PipelineRepo {
  latestWithLock(): BaselineRun | null;
  latest(): BaselineRun | null;
  findRunDir(id: string): string | null;
  readLock(dir: string): PipelineLock;
  readHeadline(dir: string): string | null;
  scanNow(): { capturedAt: unknown; aggregates: unknown };
  manifestCounts(): unknown;
}

export const filePipelineRepo: PipelineRepo = {
  latestWithLock: () => findLatestRunWithLock(),
  latest: () => findLatestRun(),
  findRunDir: (id) => findRunDir(id),
  readLock: (dir) => readPipelineLockFromDir(dir),
  readHeadline: (dir) => {
    try {
      const state: unknown = JSON.parse(
        fs.readFileSync(path.join(dir, "session-state.json"), "utf8")
      );
      return buildHeadline(asRecord(isObjectRecord(state) ? state.ctx : {}));
    } catch {
      return null;
    }
  },
  scanNow: () => scanPipelineNow(),
  manifestCounts: () => manifestCounts(),
};
