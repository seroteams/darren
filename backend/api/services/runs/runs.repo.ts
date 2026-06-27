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

export interface RunsRepo {
  listRecent(limit: number): unknown[];
  listFinished(): unknown[];
  summarize(id: string): unknown; // falsy when the run is unknown
  compare(id: string): unknown;
  readStages(id: string): unknown;
  deleteRun(id: string): DeleteResult;
  dropSession(id: string): void; // evict any in-memory session for a deleted run
  setArchived(id: string, archived: boolean): ArchiveResult;
  findRunDir(id: string): string | null;
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
  listRecent: (limit) => listRecentRuns(limit),
  listFinished: () => listFinishedRuns(),
  summarize: (id) => summarizeRun(id),
  compare: (id) => compareRun(id),
  readStages: (id) => readRunStages(id),
  deleteRun: (id) => deleteRun(id),
  dropSession: (id) => {
    dropSession(id);
  },
  setArchived: (id, archived) => setArchived(id, archived),
  findRunDir: (id) => findRunDir(id),
  readReview: (dir) => readReviewFile(dir),
  writeReview: (dir, data) => writeReviewFile(dir, data),
};
