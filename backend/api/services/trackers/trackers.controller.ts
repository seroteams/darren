// Thin controller for tracker items (monthly-checkin Phase 2) — HTTP in/out only. Internal
// admin only this phase (requireInternalAdmin; the member lane is Phase 7's own fenced
// endpoints), fenced to the caller's org + roster person in the service. Origin guards on the
// mutating routes live in server.ts.

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth, requireInternalAdmin } from "../../middleware/require-auth.ts";
import { trackersService } from "./trackers.service.ts";

async function trackerCaller(c: RequestContext): Promise<{ orgId: string; managerId: string }> {
  const identity = await buildIdentity(c.req);
  requireInternalAdmin(identity);
  return { orgId: identity.orgId ?? "", managerId: identity.userId ?? "" };
}

/** The member caller (Phase 7): any logged-in role (401 if anonymous). The service fences to the
 *  caller's OWN person — the identity is never trusted for anything but "who am I". */
async function memberCaller(c: RequestContext): Promise<{ userId: string; orgId: string }> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity);
  return { userId: identity.userId ?? "", orgId: identity.orgId ?? "" };
}

export async function listTrackerItems(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await trackerCaller(c);
  const q = c.query.includeArchived;
  const includeArchived = q === "1" || q === "true";
  c.json(200, await trackersService.listForPerson(c.params.personId ?? "", orgId, managerId, { includeArchived }));
}

export async function createTrackerItem(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await trackerCaller(c);
  const b = (await c.readBody()) as
    | { kind?: unknown; text?: unknown; owner?: unknown; category?: unknown; status?: unknown; progress?: unknown; note?: unknown; createdSessionId?: unknown }
    | null;
  c.json(
    200,
    await trackersService.create(c.params.personId ?? "", orgId, managerId, {
      kind: b?.kind,
      text: b?.text,
      owner: b?.owner,
      category: b?.category,
      status: b?.status,
      progress: b?.progress,
      note: b?.note,
      createdSessionId: typeof b?.createdSessionId === "string" ? b.createdSessionId : null,
    }),
  );
}

export async function updateTrackerItem(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await trackerCaller(c);
  const b = (await c.readBody()) as
    | { text?: unknown; status?: unknown; progress?: unknown; category?: unknown; note?: unknown; archived?: unknown }
    | null;
  c.json(
    200,
    await trackersService.update(c.params.id ?? "", orgId, managerId, {
      text: b?.text,
      status: b?.status,
      progress: b?.progress,
      category: b?.category,
      note: b?.note,
      archived: b?.archived,
    }),
  );
}

// ── Member lane (Phase 7) ─────────────────────────────────────────────────────────────────
export async function listMyTrackerItems(c: RequestContext): Promise<void> {
  const { userId, orgId } = await memberCaller(c);
  c.json(200, await trackersService.listForMember(userId, orgId));
}

export async function createMyRequest(c: RequestContext): Promise<void> {
  const { userId, orgId } = await memberCaller(c);
  const b = (await c.readBody()) as { text?: unknown; category?: unknown } | null;
  c.json(200, await trackersService.createRequestForMember(userId, orgId, { text: b?.text, category: b?.category }));
}

export async function updateMyGoal(c: RequestContext): Promise<void> {
  const { userId, orgId } = await memberCaller(c);
  const b = (await c.readBody()) as { progress?: unknown; note?: unknown } | null;
  c.json(200, await trackersService.updateGoalForMember(userId, orgId, c.params.id ?? "", { progress: b?.progress, note: b?.note }));
}
