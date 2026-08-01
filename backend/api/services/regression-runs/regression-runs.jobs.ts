// Rerun job state + guard rails: start a paid rerun of one or more frozen cases
// and report how it's going. The runner is an injected boundary, so this file
// never touches the engine or the network.
//
// Two backstops, both about money:
//  1. The shared engine job slot (engine-job-slot.ts) — one paid QA run at a time
//     across the whole server, so this and the Test engine can never spend at once.
//  2. A cumulative batch ceiling. A batch is sequential; if the running total
//     passes the ceiling the batch stops where it is rather than finishing the
//     list. Cases already run keep their results.

import { badRequest, conflict } from "../../middleware/http-error.ts";
import { acquire, release } from "../engine-job-slot.ts";
import type { RegressionRunner, RunGrade } from "./regression-runs.runner.ts";

const TOOL = "regression";

const TOOL_LABEL: Record<string, string> = {
  "test-engine": "the Test engine",
  regression: "a regression rerun",
};

/** The most a single batch may spend before it stops itself. */
export const BATCH_CEILING_USD = 6;

export type JobStatus = "idle" | "running" | "done" | "failed";

export interface CaseOutcome {
  caseId: string;
  sessionId: string | null;
  costUsd: number | null;
  regressed: boolean | null;
  error: string | null;
}

export interface RerunJob {
  status: JobStatus;
  batchId: string | null;
  caseIds: string[];
  caseId: string | null;
  caseIndex: number | null;
  caseTotal: number | null;
  sessionId: string | null;
  stageLabel: string | null;
  turn: number | null;
  total: number | null;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
  costUsd: number;
  stoppedOnCeiling: boolean;
  outcomes: CaseOutcome[];
}

export interface RegressionJobsDeps {
  /** Case ids that actually exist in the frozen suite. */
  knownCaseIds: () => string[];
  hasApiKey: () => boolean;
  runner: RegressionRunner;
  now?: () => number;
}

export interface RegressionJobsService {
  start(caseIds: unknown, orgId: string | null): Promise<{ batchId: string; caseIds: string[] }>;
  current(): RerunJob;
}

const IDLE: RerunJob = {
  status: "idle",
  batchId: null,
  caseIds: [],
  caseId: null,
  caseIndex: null,
  caseTotal: null,
  sessionId: null,
  stageLabel: null,
  turn: null,
  total: null,
  startedAt: null,
  finishedAt: null,
  error: null,
  costUsd: 0,
  stoppedOnCeiling: false,
  outcomes: [],
};

/** A sortable, human-readable batch id derived from the clock, e.g. 2026Jul31-1512. */
export function batchIdFrom(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${months[d.getMonth()]}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function createRegressionJobsService(deps: RegressionJobsDeps): RegressionJobsService {
  const now = deps.now ?? Date.now;
  let job: RerunJob = { ...IDLE };

  return {
    // async so validation errors reject (controllers await), even though the batch
    // itself is deliberately NOT awaited — the caller polls current() instead.
    start: async (rawCaseIds, orgId) => {
      const known = deps.knownCaseIds();
      const asked = Array.isArray(rawCaseIds)
        ? rawCaseIds.filter((c): c is string => typeof c === "string")
        : typeof rawCaseIds === "string"
          ? [rawCaseIds]
          : [];
      // No ids means the whole suite — that is the "Rerun all" button.
      const caseIds = asked.length ? asked : known;
      if (!caseIds.length) throw badRequest("no cases to rerun");
      const unknown = caseIds.filter((c) => !known.includes(c));
      if (unknown.length) throw badRequest(`unknown case: ${unknown.join(", ")}`);
      if (!deps.hasApiKey()) throw conflict("OPENAI_API_KEY is not set — the engine can't run");

      // Validation first, THEN the slot: a rejected request must not hold it.
      const busy = acquire(TOOL, now);
      if (busy) {
        const who = TOOL_LABEL[busy.tool] || busy.tool;
        throw conflict(`${who} is already running — wait for it to finish`);
      }

      const startedAt = now();
      const batchId = batchIdFrom(startedAt);
      job = {
        ...IDLE,
        status: "running",
        batchId,
        caseIds,
        caseTotal: caseIds.length,
        stageLabel: "Starting",
        startedAt,
        outcomes: [],
      };
      const started = job; // guard: only this batch may write its own job slot

      void (async () => {
        try {
          for (let i = 0; i < caseIds.length; i += 1) {
            const caseId = caseIds[i]!;
            if (job !== started) return;
            if (job.costUsd >= BATCH_CEILING_USD) {
              job.stoppedOnCeiling = true;
              break;
            }
            job.caseId = caseId;
            job.caseIndex = i + 1;
            job.sessionId = null;
            job.stageLabel = "Starting session";
            job.turn = null;
            job.total = null;

            try {
              const r = await deps.runner(
                { caseId, batchId, orgId },
                {
                  onSession: (sessionId) => {
                    if (job === started) job.sessionId = sessionId;
                  },
                  onProgress: (p) => {
                    if (job !== started) return;
                    if (p.stageLabel !== undefined) job.stageLabel = p.stageLabel;
                    if (p.turn !== undefined) job.turn = p.turn;
                    if (p.total !== undefined) job.total = p.total;
                  },
                }
              );
              if (job !== started) return;
              job.costUsd += r.costUsd || 0;
              job.outcomes.push({
                caseId,
                sessionId: r.sessionId,
                costUsd: r.costUsd,
                regressed: r.grade ? r.grade.regressed : null,
                error: null,
              });
            } catch (e) {
              // One bad case must not kill the batch — record it and carry on.
              if (job !== started) return;
              const msg = e instanceof Error ? e.message : String(e);
              console.warn(`[regression-runs] case "${caseId}" failed:`, msg);
              job.outcomes.push({ caseId, sessionId: null, costUsd: null, regressed: null, error: msg });
            }
          }
          if (job !== started) return;
          job.status = "done";
          job.finishedAt = now();
        } catch (e) {
          if (job !== started) return;
          job.status = "failed";
          job.error = e instanceof Error ? e.message : String(e);
          job.finishedAt = now();
        } finally {
          release(TOOL);
        }
      })();

      return { batchId, caseIds };
    },

    current: () => ({ ...job, caseIds: [...job.caseIds], outcomes: job.outcomes.map((o) => ({ ...o })) }),
  };
}

export type { RunGrade };
