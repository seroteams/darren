// Thin controller for per-person trackers (monthly-one-on-one Phase 2). Internal-only
// (requireInternalAdmin — a corridor manager is a real 403), fenced to the caller's org +
// the roster person they manage in the service. Origin guards on the mutating routes live
// in server.ts (mirrors team/people + guided-sessions). Phase 7 adds the fenced MEMBER lane
// as its own narrow endpoints — never these.

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireInternalAdmin } from "../../middleware/require-auth.ts";
import { asRecord } from "../../../shared/guards.ts";
import { createTrackersService } from "./trackers.service.ts";
import { pgTrackersRepo } from "./trackers.repo.ts";
import { pgPeopleRepo } from "../team/people.repo.ts";

export const trackersService = createTrackersService({ repo: pgTrackersRepo, people: pgPeopleRepo });

async function internalCaller(c: RequestContext): Promise<{ orgId: string; managerId: string }> {
  const identity = await buildIdentity(c.req);
  requireInternalAdmin(identity); // 401 logged out; 403 corridor manager / member
  return { orgId: identity.orgId ?? "", managerId: identity.userId ?? "" };
}

// GET /api/v1/people/:personId/tracker-items?includeArchived=1
export async function listForPerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  const includeArchived = c.query.includeArchived === "1" || c.query.includeArchived === "true";
  c.json(200, await trackersService.listForPerson(orgId, managerId, c.params.personId ?? "", { includeArchived }));
}

// POST /api/v1/people/:personId/tracker-items  { kind, text, owner?, category?, progress?, note?, sessionId? }
export async function create(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  const body = asRecord(await c.readBody());
  c.json(201, await trackersService.create(orgId, managerId, c.params.personId ?? "", body));
}

// PATCH /api/v1/tracker-items/:id  { status?, progress?, note? }
export async function update(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  const body = asRecord(await c.readBody());
  c.json(200, await trackersService.update(orgId, managerId, c.params.id ?? "", body));
}
