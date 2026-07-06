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
  listFinishedRunsForMember,
  listFinishedRunsAboutPerson,
  memberRunView,
  cloneRun,
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
  // Manager 1:1 rating (pre-go-live PG3): a rating.json sidecar in the run folder.
  readRating(dir: string): unknown; // existing rating.json, or null
  writeRating(dir: string, data: unknown): void;
  // Member-safe reads (member-nav Phase 2) — fenced by BOTH orgId and userId, so a
  // member sees only runs they created. memberRun returns null when the run is unknown
  // or owned by someone else. includeOpen (Team-for-managers) adds the caller's
  // started-but-unfinished preps, each row flagged `finished`.
  listFinishedForMember(orgId: string | null | undefined, userId: string | null | undefined, includeOpen?: boolean): unknown[];
  // The 1:1s ABOUT a set of roster people (people-roster Phase 5) — a linked member's
  // list. Minimal rows by design (type + dates + managerId); privacy lives in the engine.
  listAboutPerson(orgId: string | null | undefined, personIds: string[]): unknown[];
  memberRun(id: string, orgId: string | null | undefined, userId: string | null | undefined): unknown;
  // Dev-only "prefill a run": copy a finished run into a fresh one owned by the caller.
  // Source is UNFENCED across companies, so the route MUST stay dev-only (see F-002).
  // Returns the new run's id, or null when the source is unknown / not finished.
  cloneRun(sourceId: string, orgId: string | null, userId: string | null): { id: string } | null;
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

// Same null-safe read + atomic write for the manager's rating.json sidecar (PG3).
function readRatingFile(dir: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "rating.json"), "utf8"));
  } catch {
    return null;
  }
}
function writeRatingFile(dir: string, data: unknown): void {
  const target = path.join(dir, "rating.json");
  const tmp = path.join(dir, "rating.json.tmp");
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
  readRating: (dir) => readRatingFile(dir),
  writeRating: (dir, data) => writeRatingFile(dir, data),
  listFinishedForMember: (orgId, userId, includeOpen) => listFinishedRunsForMember(orgId, userId, includeOpen),
  listAboutPerson: (orgId, personIds) => listFinishedRunsAboutPerson(orgId, personIds),
  memberRun: (id, orgId, userId) => memberRunView(id, orgId, userId),
  cloneRun: (sourceId, orgId, userId) => cloneRun(sourceId, orgId, userId),
};
