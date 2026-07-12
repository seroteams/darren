// Thin controller for guided sessions (monthly-checkin Phase 1) — HTTP in/out only.
// Internal admin only (requireInternalAdmin: a plain manager is 403, so corridor managers
// keep the current flow), fenced to the caller's orgId + managerId in the service. Origin
// guards on the mutating routes live in server.ts (mirrors team/people).

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireInternalAdmin } from "../../middleware/require-auth.ts";
import { badRequest } from "../../middleware/http-error.ts";
import { guidedSessionsService } from "./guided-sessions.service.ts";

/** The guided caller — internal admin only (401 logged out; 403 member/plain manager), with
 *  the org + manager ids the service fences on. */
async function guidedCaller(c: RequestContext): Promise<{ orgId: string; managerId: string }> {
  const identity = await buildIdentity(c.req);
  requireInternalAdmin(identity);
  return { orgId: identity.orgId ?? "", managerId: identity.userId ?? "" };
}

export async function createGuidedSession(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await guidedCaller(c);
  const body = (await c.readBody()) as { personId?: unknown } | null;
  c.json(200, await guidedSessionsService.create(orgId, managerId, { personId: body?.personId }));
}

export async function getGuidedSession(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await guidedCaller(c);
  c.json(200, await guidedSessionsService.get(c.params.id ?? "", orgId, managerId));
}

export async function listGuidedSessions(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await guidedCaller(c);
  const personId = c.query.personId ?? "";
  if (!personId) throw badRequest("personId is required");
  c.json(200, await guidedSessionsService.listForPerson(personId, orgId, managerId));
}

export async function patchGuidedSession(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await guidedCaller(c);
  const body = (await c.readBody()) as { stage?: unknown; state?: unknown } | null;
  c.json(
    200,
    await guidedSessionsService.patch(c.params.id ?? "", orgId, managerId, {
      stage: body?.stage,
      state: body?.state,
    }),
  );
}

export async function completeGuidedSession(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await guidedCaller(c);
  c.json(200, await guidedSessionsService.complete(c.params.id ?? "", orgId, managerId));
}

export async function getBlockScores(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await guidedCaller(c);
  c.json(200, await guidedSessionsService.listBlockScores(c.params.personId ?? "", orgId, managerId));
}
