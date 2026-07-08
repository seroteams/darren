// Data access for pipeline status — run lookups + lock reads behind one async
// interface (postgres-runtime-data Phase 3): `pgPipelineRepo` reads the sessions
// table + the pipeline-lock artifact row; `filePipelineRepo` keeps the disk walk
// as the DB-less mode. The service's baseline-selection logic never touches
// storage directly.

import fs from "node:fs";
import path from "node:path";
import { readPipelineLockFromDir } from "../../../engine/pipeline-lock.ts";
import {
  findRunDir,
  findLatestRunWithLock,
  findLatestRun,
  buildHeadline,
} from "../../../engine/run-history.ts";
import {
  pgFindLatestRunWithLock,
  pgFindLatestRun,
  pgReadPipelineLock,
  pgSummarizeRun,
} from "../../../db/runs-store.ts";
import { hasDatabaseUrl } from "../../../db/client.ts";
import { isObjectRecord, asRecord, asString } from "../../../shared/guards.ts";

// PipelineLock isn't exported from pipeline-lock — pull it off the return type.
export type PipelineLock = ReturnType<typeof readPipelineLockFromDir>;

export interface BaselineRun {
  id: string;
  headline: string;
  lock: PipelineLock;
}

export interface PipelineRepo {
  latestWithLock(): Promise<BaselineRun | null>;
  latest(): Promise<BaselineRun | null>;
  /** One specific run's lock + headline; null when the run is unknown. */
  baselineById(id: string): Promise<{ lock: PipelineLock; headline: string | null } | null>;
}

export const filePipelineRepo: PipelineRepo = {
  latestWithLock: async () => findLatestRunWithLock() as BaselineRun | null,
  latest: async () => findLatestRun() as BaselineRun | null,
  baselineById: async (id) => {
    const dir = findRunDir(id);
    if (!dir) return null;
    let headline: string | null = null;
    try {
      const state: unknown = JSON.parse(fs.readFileSync(path.join(dir, "session-state.json"), "utf8"));
      headline = buildHeadline(asRecord(isObjectRecord(state) ? state.ctx : {}));
    } catch {
      headline = null;
    }
    return { lock: readPipelineLockFromDir(dir), headline };
  },
};

export const pgPipelineRepo: PipelineRepo = {
  latestWithLock: async () => (await pgFindLatestRunWithLock()) as BaselineRun | null,
  latest: async () => (await pgFindLatestRun()) as BaselineRun | null,
  baselineById: async (id) => {
    const summary = await pgSummarizeRun(id); // null = unknown run (unfenced, like findRunDir here)
    if (!summary) return null;
    const lock = (await pgReadPipelineLock(id)) as PipelineLock;
    return { lock, headline: asString(asRecord(summary).headline) || null };
  },
};

export const pipelineRepo: PipelineRepo = hasDatabaseUrl() ? pgPipelineRepo : filePipelineRepo;
