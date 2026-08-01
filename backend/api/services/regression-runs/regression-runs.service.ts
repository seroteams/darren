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

export interface BoardResult {
  cases: BoardRow[];
  /** False on the live site: paid reruns are local-only until Carl flips it (Phase 5). */
  canRerun: boolean;
}

export interface RegressionRunsService {
  list(): Promise<BoardResult>;
}

// Newest first, so [0] is the latest rerun of that case.
function newestFirst(a: RerunRow, b: RerunRow): number {
  return String(b.finishedAt || "").localeCompare(String(a.finishedAt || ""));
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

export function createRegressionRunsService(
  repo: RegressionRunsRepo,
  canRerun: () => boolean,
): RegressionRunsService {
  return {
    async list() {
      const suite = repo.listSuite();
      const reruns = await repo.listReruns();
      return {
        cases: suite.map((c) => toRow(c, reruns)),
        canRerun: canRerun(),
      };
    },
  };
}
