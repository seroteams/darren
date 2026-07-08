// Data access for finished-run history + the in-app Run Review — the storage
// seam. Two implementations behind one async interface (postgres-runtime-data
// Phase 3): `pgRunsRepo` reads the sessions/run_artifacts tables (the app's
// source of truth when DATABASE_URL is set); `fileRunsRepo` delegates to the
// run-history engine walk — the DB-less dev mode and the standing rollback.
// Review/rating are id-based here; the file impl resolves the run dir
// internally, the pg impl reads/writes the sessions columns (+ file echo).

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
import {
  pgListRecentRuns,
  pgListFinishedRuns,
  pgSummarizeRun,
  pgCompareRun,
  pgReadRunStages,
  pgDeleteRun,
  pgSetArchived,
  pgRunExists,
  pgReadReview,
  pgWriteReview,
  pgReadRating,
  pgWriteRating,
  pgListFinishedRunsForMember,
  pgListFinishedRunsAboutPerson,
  pgMemberRunView,
  pgCloneRun,
} from "../../../db/runs-store.ts";
import { hasDatabaseUrl } from "../../../db/client.ts";
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
  listRecent(limit: number, orgId?: string | null): Promise<unknown[]>;
  listFinished(orgId?: string | null): Promise<unknown[]>;
  summarize(id: string, orgId?: string | null): Promise<unknown>; // falsy when the run is unknown
  compare(id: string, orgId?: string | null): Promise<unknown>;
  readStages(id: string, orgId?: string | null): Promise<unknown>;
  deleteRun(id: string, orgId?: string | null): Promise<DeleteResult>;
  dropSession(id: string): void; // evict any in-memory session for a deleted run
  setArchived(id: string, archived: boolean, orgId?: string | null): Promise<ArchiveResult>;
  // Does this run exist for this caller? (replaces the dir-based findRunDir probe —
  // same fence: another company's run answers false, like an unknown id.)
  runExists(id: string, orgId?: string | null): Promise<boolean>;
  readReview(id: string, orgId?: string | null): Promise<unknown>; // existing review, or null
  writeReview(id: string, orgId: string | null | undefined, data: unknown): Promise<void>;
  // Manager 1:1 rating (pre-go-live PG3).
  readRating(id: string, orgId?: string | null): Promise<unknown>;
  writeRating(id: string, orgId: string | null | undefined, data: unknown): Promise<void>;
  // Member-safe reads (member-nav Phase 2) — fenced by BOTH orgId and userId, so a
  // member sees only runs they created. memberRun returns null when the run is unknown
  // or owned by someone else. includeOpen (Team-for-managers) adds the caller's
  // started-but-unfinished preps, each row flagged `finished`.
  listFinishedForMember(orgId: string | null | undefined, userId: string | null | undefined, includeOpen?: boolean): Promise<unknown[]>;
  // The 1:1s ABOUT a set of roster people (people-roster Phase 5) — a linked member's
  // list. Minimal rows by design (type + dates + managerId); privacy lives in the engine.
  listAboutPerson(orgId: string | null | undefined, personIds: string[]): Promise<unknown[]>;
  memberRun(id: string, orgId: string | null | undefined, userId: string | null | undefined): Promise<unknown>;
  // Dev-only "prefill a run": copy a finished run into a fresh one owned by the caller.
  // Source is UNFENCED across companies, so the route MUST stay dev-only (see F-002).
  // Returns the new run's id, or null when the source is unknown / not finished.
  cloneRun(sourceId: string, orgId: string | null, userId: string | null): Promise<{ id: string } | null>;
}

// Null-safe read of a run's sidecar json — missing/corrupt → null, never throws.
function readSidecar(dir: string, name: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  } catch {
    return null;
  }
}

// Atomic write: stage to a temp file in the same dir, then rename over the target
// so a crash mid-write can never leave a torn sidecar.
function writeSidecar(dir: string, name: string, data: unknown): void {
  const target = path.join(dir, name);
  const tmp = path.join(dir, name + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, target);
}

function requireDir(id: string, orgId?: string | null): string {
  const dir = findRunDir(id, orgId);
  if (!dir) throw new Error("unknown run");
  return dir;
}

export const fileRunsRepo: RunsRepo = {
  listRecent: async (limit, orgId) => listRecentRuns(limit, orgId),
  listFinished: async (orgId) => listFinishedRuns(orgId),
  summarize: async (id, orgId) => summarizeRun(id, orgId),
  compare: async (id, orgId) => compareRun(id, orgId),
  readStages: async (id, orgId) => readRunStages(id, orgId),
  deleteRun: async (id, orgId) => deleteRun(id, orgId),
  dropSession: (id) => {
    dropSession(id);
  },
  setArchived: async (id, archived, orgId) => setArchived(id, archived, orgId),
  runExists: async (id, orgId) => findRunDir(id, orgId) !== null,
  readReview: async (id, orgId) => {
    const dir = findRunDir(id, orgId);
    return dir ? readSidecar(dir, "review.json") : null;
  },
  writeReview: async (id, orgId, data) => {
    writeSidecar(requireDir(id, orgId), "review.json", data);
  },
  readRating: async (id, orgId) => {
    const dir = findRunDir(id, orgId);
    return dir ? readSidecar(dir, "rating.json") : null;
  },
  writeRating: async (id, orgId, data) => {
    writeSidecar(requireDir(id, orgId), "rating.json", data);
  },
  listFinishedForMember: async (orgId, userId, includeOpen) => listFinishedRunsForMember(orgId, userId, includeOpen),
  listAboutPerson: async (orgId, personIds) => listFinishedRunsAboutPerson(orgId, personIds),
  memberRun: async (id, orgId, userId) => memberRunView(id, orgId, userId),
  cloneRun: async (sourceId, orgId, userId) => cloneRun(sourceId, orgId, userId),
};

export const pgRunsRepo: RunsRepo = {
  listRecent: (limit, orgId) => pgListRecentRuns(limit, orgId),
  listFinished: (orgId) => pgListFinishedRuns(orgId),
  summarize: (id, orgId) => pgSummarizeRun(id, orgId),
  compare: (id, orgId) => pgCompareRun(id, orgId),
  readStages: (id, orgId) => pgReadRunStages(id, orgId),
  deleteRun: (id, orgId) => pgDeleteRun(id, orgId),
  dropSession: (id) => {
    dropSession(id);
  },
  setArchived: (id, archived, orgId) => pgSetArchived(id, archived, orgId),
  runExists: (id, orgId) => pgRunExists(id, orgId),
  readReview: (id, orgId) => pgReadReview(id, orgId),
  writeReview: (id, orgId, data) => pgWriteReview(id, orgId, data),
  readRating: (id, orgId) => pgReadRating(id, orgId),
  writeRating: (id, orgId, data) => pgWriteRating(id, orgId, data),
  listFinishedForMember: (orgId, userId, includeOpen) => pgListFinishedRunsForMember(orgId, userId, includeOpen),
  listAboutPerson: (orgId, personIds) => pgListFinishedRunsAboutPerson(orgId, personIds),
  memberRun: (id, orgId, userId) => pgMemberRunView(id, orgId, userId),
  cloneRun: (sourceId, orgId, userId) => pgCloneRun(sourceId, orgId, userId),
};

// Same interface, swappable storage (the session-runtime pattern): Postgres when
// DATABASE_URL is set — the read cutover — else the file-backed repo, so the app
// still runs with no database configured.
export const runsRepo: RunsRepo = hasDatabaseUrl() ? pgRunsRepo : fileRunsRepo;
