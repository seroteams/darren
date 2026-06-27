// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. The origin guard on the mutating route lives in server.ts.
// Only the global-promotion routes; per-session lexicon stays in handlers/lexicon.ts.

import type { RequestContext } from "../../router.ts";
import { createLexiconService } from "./lexicon.service.ts";
import { fileLexiconRepo } from "./lexicon.repo.ts";

const service = createLexiconService(fileLexiconRepo);

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

export function pending(c: RequestContext): void {
  c.json(200, service.pending());
}

export async function apply(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.apply(body.decisions));
}
