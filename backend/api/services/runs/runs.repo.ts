// Data access for finished-run history + the in-app Run Review — the storage
// seam. Delegates to the run-history engine (list/summarise/compare/stages/delete/
// archive/find-dir) and owns the review.json sidecar read/write. A DB-backed impl
// can replace `fileRunsRepo` without touching the service. Run records and
// summaries are opaque to the service, so they're typed unknown.

import fs from "node:fs";
import path from "node:path";
import {
  listRecentRuns,
  listFinishedRuns,
  summarizeRun,
  compareRun,
  readRunStages,
  deleteRun,
  setArchived,
  findRunDir,
} from "../../../engine/run-history.ts";
import { dropSession } from "../../sessions.ts";

export interface DeleteResult {
  deleted: boolean;
  id: string;
  reason?: string;
  dir?: string;
}
export interface ArchiveResult {
  ok: boolean;
  id: string;
  reason?: string;
  archived?: boolean;
}

// Every read takes an optional orgId — the caller's company. When given, only that
// company's runs are visible and a by-id read of another company's run resolves to
// "unknown" (the data wall, Phase 007/2). Omitted = unfenced (CLI/gate).
export interface RunsRepo {
  listRecent(limit: number, orgId?: string | null): unknown[];
  listFinished(orgId?: string | null): unknown[];
  summarize(id: string, orgId?: string | null): unknown; // falsy when the run is unknown
  compare(id: string, orgId?: string | null): unknown;
  readStages(id: string, orgId?: string | null): unknown;
  deleteRun(id: string, orgId?: string | null): DeleteResult;
  dropSession(id: string): void; // evict any in-memory session for a deleted run
  setArchived(id: string, archived: boolean, orgId?: string | null): ArchiveResult;
  findRunDir(id: string, orgId?: string | null): string | null;
  readReview(dir: string): unknown; // existing review.json, or null
  writeReview(dir: string, data: unknown): void;
}

// Null-safe read of a run's review.json — missing/corrupt → null, never throws.
function readReviewFile(dir: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "review.json"), "utf8"));
  } catch {
    return null;
  }
}

// Atomic write: stage to a temp file in the same dir, then rename over the target
// so a crash mid-write can never leave a torn review.json.
function writeReviewFile(dir: string, data: unknown): void {
  const target = path.join(dir, "review.json");
  const tmp = path.join(dir, "review.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, target);
}

export const fileRunsRepo: RunsRepo = {
  listRecent: (limit, orgId) => listRecentRuns(limit, orgId),
  listFinished: (orgId) => listFinishedRuns(orgId),
  summarize: (id, orgId) => summarizeRun(id, orgId),
  compare: (id, orgId) => compareRun(id, orgId),
  readStages: (id, orgId) => readRunStages(id, orgId),
  deleteRun: (id, orgId) => deleteRun(id, orgId),
  dropSession: (id) => {
    dropSession(id);
  },
  setArchived: (id, archived, orgId) => setArchived(id, archived, orgId),
  findRunDir: (id, orgId) => findRunDir(id, orgId),
  readReview: (dir) => readReviewFile(dir),
  writeReview: (dir, data) => writeReviewFile(dir, data),
};
