// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. This is also where the real engine, sessions and
// trust-check boundaries get wired into the runner (adapters only).
//
// canRerun is resolved PER REQUEST (not at module load) so the live site reports
// paid reruns as switched off without a restart, and tests can flip the env.

import type { RequestContext } from "../../router.ts";
import { resolveAppEnv } from "../../../db/env-guard.ts";
import { createRegressionRunsRepo } from "./regression-runs.repo.ts";
import { createRegressionRunsService } from "./regression-runs.service.ts";
import { createRegressionRunner } from "./regression-runs.runner.ts";
import { createRegressionJobsService } from "./regression-runs.jobs.ts";
import { createSessionsService } from "../sessions/sessions.service.ts";
import { sessionsRepo } from "../sessions/session-runtime.ts";
import { ensureRoleProfile } from "../../../engine/role-profile.ts";
import { generateFocusPoints } from "../../../engine/generate.ts";
import { generatePreparation } from "../../../engine/preparation.ts";
import { generateBankWithFallback } from "../../../engine/question-generator.ts";
import { planTurn } from "../../../engine/queue-manager.ts";
import { evaluate } from "../../../engine/reviewer.ts";
import { runTrustChecks } from "../../../../evals/trust-checks.ts";
import { judgeRerun } from "../../../engine/regression-judge.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { asRecord } from "../../../shared/guards.ts";

const repo = createRegressionRunsRepo();

// A QA sessions-service instance over the SAME live-session store as the web app,
// but with no pre-warm boundary — the runner makes every paid call itself, once.
const qaSessions = createSessionsService(sessionsRepo, {});

const runner = createRegressionRunner({
  loadScenario: (caseId) => repo.loadScenario(caseId),
  sessions: qaSessions,
  engine: {
    ensureRoleProfile: (ctx, opts) => ensureRoleProfile(ctx, opts),
    generateFocusPoints: (ctx, opts) => generateFocusPoints(ctx, opts),
    generatePreparation: (inputs, opts) => generatePreparation(inputs, opts),
    // Same fallback the live bank stage uses: a generation failure drops to _seed
    // rather than killing the run, and says so in the log.
    generateBank: (input, opts) =>
      generateBankWithFallback(input as unknown as Parameters<typeof generateBankWithFallback>[0], opts, {
        onFallback: (e: unknown) =>
          console.warn("[regression-run] bank generation failed, falling back to _seed:", e instanceof Error ? e.message : String(e)),
      }),
    planTurn: (input) => planTurn(input as Parameters<typeof planTurn>[0]),
    evaluate: (input, opts) => evaluate(input as Parameters<typeof evaluate>[0], opts),
  },
  // The SAME deterministic checks scripts/gate.js runs — one source of truth for
  // what "the engine broke trust" means, in the terminal and in the app.
  runTrustChecks: (input) => runTrustChecks(input as Parameters<typeof runTrustChecks>[0]),
  // The AI reviewer. Advisory only — it can never change a trust verdict.
  judge: (input) => judgeRerun(input),
  loadBaselineRun: (caseId) => repo.loadPreviousRun(caseId),
});

const board = createRegressionRunsService(repo, () => resolveAppEnv() !== "live");

const jobs = createRegressionJobsService({
  knownCaseIds: () => repo.listSuite().map((c) => c.id),
  hasApiKey: () => Boolean(process.env.OPENAI_API_KEY),
  runner,
});

// Regression reruns are internal QA tooling: admin console roles only (same gate
// as the runs endpoints). The caller's company is stamped on each run so the
// review screen can open it; reruns carry no userId, so they never appear under
// "My runs".
async function callerOrgId(c: RequestContext): Promise<string | null> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity);
  return identity.orgId;
}

export async function list(c: RequestContext): Promise<void> {
  const orgId = await callerOrgId(c);
  c.json(200, await board.list(orgId));
}

export async function start(c: RequestContext): Promise<void> {
  const orgId = await callerOrgId(c);
  const body = asRecord(await c.readBody());
  c.json(202, await jobs.start(body.caseIds ?? body.caseId, orgId));
}

export async function current(c: RequestContext): Promise<void> {
  await callerOrgId(c);
  c.json(200, jobs.current());
}
