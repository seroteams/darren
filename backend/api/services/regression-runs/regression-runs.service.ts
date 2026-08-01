// Regression rerun board logic: merge the frozen suite with whatever reruns each
// case has produced, newest first. No storage and no req/res here — the repo is
// injected so this is unit-testable without disk.
//
// Phase 1 lands the read model only: every case comes back with lastRerun: null.
// Phases 2-3 fill in the trust verdict and the AI reviewer's score; the row shape
// below is the contract those phases populate.

import type { RegressionRunsRepo, RerunRow, SuiteCase } from "./regression-runs.repo.ts";

export interface BoardRow {
  id: string;
  name: string;
  role: string;
  seniority: string;
  meetingType: string;
  kind: string;
  note: string;
  expect: { verdict: string; hard_fails: string[] };
  answerCount: number;
  scenarioPath: string;
  /** The most recent finished rerun of this case, or null when never rerun. */
  lastRerun: RerunRow | null;
}

/** One press of Rerun all (or of a single Rerun), summarised for the history list. */
export interface BatchRow {
  batchId: string;
  finishedAt: number | null;
  caseCount: number;
  ok: number;
  regressed: number;
  ungraded: number;
  costUsd: number;
  /** The engine's prompt version for this batch, short enough to read. */
  promptVersion: string | null;
  /** True when the prompts differ from the batch before it — the "what changed" cue. */
  promptsChanged: boolean;
}

export interface BoardResult {
  cases: BoardRow[];
  batches: BatchRow[];
  /** False on the live site: paid reruns are local-only until Carl flips it (Phase 5). */
  canRerun: boolean;
}

export interface RegressionRunsService {
  list(orgId?: string | null): Promise<BoardResult>;
}

// Newest first, so [0] is the latest rerun of that case.
function newestFirst(a: RerunRow, b: RerunRow): number {
  return (b.finishedAt || 0) - (a.finishedAt || 0);
}

function toRow(c: SuiteCase, reruns: RerunRow[]): BoardRow {
  const mine = reruns.filter((r) => r.caseId === c.id).sort(newestFirst);
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    seniority: c.seniority,
    meetingType: c.meetingType,
    kind: c.kind,
    note: c.note,
    expect: c.expect,
    answerCount: c.answerCount,
    scenarioPath: c.scenarioPath,
    lastRerun: mine[0] || null,
  };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function usdOf(cost: unknown): number {
  const c = asRecord(cost);
  const n = typeof c.usd === "number" ? c.usd : typeof c.usd_total === "number" ? c.usd_total : 0;
  return n;
}

/**
 * Group reruns into the batches that produced them, newest first, and mark the
 * batches where the prompts moved. That last flag is what turns a red batch from
 * "something broke" into "something changed, and here is roughly where".
 */
export function buildBatches(reruns: RerunRow[]): BatchRow[] {
  const byBatch = new Map<string, RerunRow[]>();
  for (const r of reruns) {
    if (!r.batchId) continue;
    const list = byBatch.get(r.batchId);
    if (list) list.push(r);
    else byBatch.set(r.batchId, [r]);
  }

  const rows: BatchRow[] = [];
  for (const [batchId, list] of byBatch) {
    let ok = 0;
    let regressed = 0;
    let ungraded = 0;
    let costUsd = 0;
    let finishedAt: number | null = null;
    let promptVersion: string | null = null;

    for (const r of list) {
      const grade = asRecord(r.grade);
      if (!asRecord(grade.actual).verdict) ungraded += 1;
      else if (grade.regressed) regressed += 1;
      else ok += 1;
      costUsd += usdOf(r.cost);
      if (r.finishedAt && (!finishedAt || r.finishedAt > finishedAt)) finishedAt = r.finishedAt;
      const pv = asRecord(r.fingerprint).promptVersion;
      if (!promptVersion && typeof pv === "string") promptVersion = pv;
    }

    rows.push({
      batchId,
      finishedAt,
      caseCount: list.length,
      ok,
      regressed,
      ungraded,
      costUsd,
      promptVersion,
      promptsChanged: false, // set below, once the batches are in order
    });
  }

  rows.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
  // Newest first, so each batch compares against the one AFTER it in the list.
  for (let i = 0; i < rows.length - 1; i += 1) {
    const mine = rows[i]!;
    const older = rows[i + 1]!;
    mine.promptsChanged = Boolean(mine.promptVersion && older.promptVersion && mine.promptVersion !== older.promptVersion);
  }
  return rows;
}

export function createRegressionRunsService(
  repo: RegressionRunsRepo,
  canRerun: () => boolean,
): RegressionRunsService {
  return {
    async list(orgId) {
      const suite = repo.listSuite();
      const reruns = await repo.listReruns(orgId);
      return {
        cases: suite.map((c) => toRow(c, reruns)),
        batches: buildBatches(reruns),
        canRerun: canRerun(),
      };
    },
  };
}
