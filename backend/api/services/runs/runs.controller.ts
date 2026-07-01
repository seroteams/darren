// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. Origin guards on the mutating routes live in server.ts.
// Covers run history + Run Review; suggest-fix (the AI route) stays in its handler.

import type { RequestContext } from "../../router.ts";
import { createRunsService } from "./runs.service.ts";
import { fileRunsRepo } from "./runs.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth } from "../../middleware/require-auth.ts";

const service = createRunsService(fileRunsRepo);

// The caller's company from the session cookie, login required (auth-hardening Phase 2).
// Anonymous → 401 (was: null → the legacy UNFENCED list). The dev side-door still yields
// an identity, so dev one-click is unaffected. All runs handlers resolve through here, so
// this one guard protects every runs endpoint.
async function callerOrgId(c: RequestContext): Promise<string | null> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity);
  return identity.orgId;
}

export async function recent(c: RequestContext): Promise<void> {
  c.json(200, service.recent(c.query.limit, await callerOrgId(c)));
}

export async function finished(c: RequestContext): Promise<void> {
  c.json(200, service.finished(await callerOrgId(c)));
}

export async function overview(c: RequestContext): Promise<void> {
  c.json(200, service.overview(c.params.id, await callerOrgId(c)));
}

export async function full(c: RequestContext): Promise<void> {
  c.json(200, service.full(c.params.id, await callerOrgId(c)));
}

export async function stages(c: RequestContext): Promise<void> {
  c.json(200, service.stages(c.params.id, await callerOrgId(c)));
}

export async function del(c: RequestContext): Promise<void> {
  c.json(200, service.remove(c.params.id, await callerOrgId(c)));
}

export async function archive(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  c.json(200, service.archive(c.params.id, body, await callerOrgId(c)));
}

export async function review(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  c.json(200, service.review(c.params.id, body, await callerOrgId(c)));
}
