// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. The origin guard lives in server.ts. Here we also wire the
// real AI fixer into the service's injected boundary, adapting the disk-sourced
// (unknown) verdict/ctx to the engine fixer's all-optional types via `|| null`.

import type { RequestContext } from "../../router.ts";
import { createSuggestFixService } from "./suggest-fix.service.ts";
import type { RunFix } from "./suggest-fix.service.ts";
import { fileSuggestFixRepo } from "./suggest-fix.repo.ts";
import { suggestFix } from "../../../engine/prompt-fixer.ts";

const runFix: RunFix = (input) =>
  suggestFix({
    stage: input.stage,
    promptText: input.promptText,
    responseText: input.responseText,
    verdict: input.verdict || null,
    ctx: input.ctx || null,
  });

const service = createSuggestFixService(fileSuggestFixRepo, runFix);

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

export async function suggest(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, await service.suggest(body.runId, body.stage));
}
