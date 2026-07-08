// Prompt-fix suggester logic: assemble a run's prompt + response + tester verdict
// and ask the fixer for a structured suggestion (display only — the tester applies
// it by hand). Never touches req/res or storage: file reads come from the injected
// repo, and the AI call comes through the injected `runFix` boundary, so this is
// fully unit-testable without disk or a model call.

import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";
import type { SuggestFixRepo } from "./suggest-fix.repo.ts";

// The injected AI boundary. verdict/ctx are opaque here (they come from disk); the
// controller adapts them to the engine fixer's typed input.
export type RunFix = (input: {
  stage: string;
  promptText: string | null;
  responseText: string | null;
  verdict: unknown;
  ctx: unknown;
}) => Promise<unknown>;

export interface SuggestFixService {
  suggest(runId: unknown, stage: unknown): Promise<{ fix: unknown }>;
}

export function createSuggestFixService(repo: SuggestFixRepo, runFix: RunFix): SuggestFixService {
  return {
    suggest: async (rawRunId, rawStage) => {
      const runId = typeof rawRunId === "string" ? rawRunId : "";
      const stage = typeof rawStage === "string" ? rawStage : "evaluation";
      if (!runId) throw badRequest("runId required");

      const state = await repo.readState(runId);
      if (!state) throw notFound("unknown run");

      const verdict = state.verdict || null;
      if (!verdict) throw conflict("no verdict on this run — record one first");

      const promptText = await repo.readPrompt(runId, stage);
      const responseText = await repo.readResponse(runId, stage);
      const ctx = state.ctx || null;

      try {
        const fix = await runFix({ stage, promptText, responseText, verdict, ctx });
        return { fix };
      } catch (e) {
        // Surface the failure honestly: legacy keeps this message, v1 masks 5xx.
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[suggest-fix] failed:", msg);
        throw Object.assign(new Error("fix suggestion failed: " + msg), { status: 502 });
      }
    },
  };
}
