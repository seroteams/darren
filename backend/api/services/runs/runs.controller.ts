// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. Origin guards on the mutating routes live in server.ts.
// Covers run history + Run Review; suggest-fix (the AI route) stays in its handler.

import type { RequestContext } from "../../router.ts";
import { createRunsService } from "./runs.service.ts";
import { fileRunsRepo } from "./runs.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin, requireAuth } from "../../middleware/require-auth.ts";

const service = createRunsService(fileRunsRepo);

// The caller's company from the session cookie, ADMIN required (admin-access-guard
// Phase 2). Run history + Run Review are internal QA tooling, so a logged-in non-admin
// member is refused (403); anonymous is 401. The dev side-door still yields an owner
// identity, so dev one-click is unaffected. All runs handlers resolve through here, so
// this one guard protects every runs endpoint.
async function callerOrgId(c: RequestContext): Promise<string | null> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity);
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

// The caller's own identity — login required, ANY role (member-nav Phase 2). The member
// "my runs" endpoints use this instead of callerOrgId: a plain member reads their OWN
// runs even though the admin runs tooling above stays owner/admin-only. Fenced by both
// orgId and userId in the service, so a member never sees another member's or an admin's.
async function callerIdentity(c: RequestContext): Promise<{ userId: string | null; orgId: string | null }> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity); // 401 when logged out; no role check
  return { userId: identity.userId, orgId: identity.orgId };
}

export async function mine(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, service.myFinished(orgId, userId));
}

export async function mineDetail(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, service.myRun(c.params.id, orgId, userId));
}
