// Thin controller for Monthly Check-in guided sessions (monthly-one-on-one Phase 1).
// Internal-only (requireInternalAdmin — admin role OR superadmin-by-email; a plain
// corridor manager is a real 403, not just hidden UI), fenced to the caller's
// orgId + managerId in the service. Origin guards on the mutating routes live in
// server.ts (mirrors team/people). No logic, no storage here.

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireInternalAdmin } from "../../middleware/require-auth.ts";
import { asRecord, asString } from "../../../shared/guards.ts";
import { createGuidedSessionsService } from "./guided-sessions.service.ts";
import { pgGuidedSessionsRepo } from "./guided-sessions.repo.ts";
import { pgPeopleRepo } from "../team/people.repo.ts";
import { trackersService } from "../trackers/trackers.controller.ts";

const service = createGuidedSessionsService({ repo: pgGuidedSessionsRepo, people: pgPeopleRepo, trackers: trackersService });

/** The internal caller — admin/superadmin only, with the org + manager fence ids. */
async function internalCaller(c: RequestContext): Promise<{ orgId: string; managerId: string }> {
  const identity = await buildIdentity(c.req);
  requireInternalAdmin(identity); // 401 logged out; 403 corridor manager / member
  return { orgId: identity.orgId ?? "", managerId: identity.userId ?? "" };
}

// POST /api/v1/guided-sessions  { personId }
export async function create(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  const body = asRecord(await c.readBody());
  c.json(201, await service.create(orgId, managerId, asString(body.personId)));
}

// GET /api/v1/guided-sessions/:id
export async function get(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  c.json(200, await service.get(c.params.id ?? "", orgId, managerId));
}

// GET /api/v1/guided-sessions?personId=<id>
export async function listForPerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  c.json(200, { sessions: await service.listForPerson(c.query.personId ?? "", orgId, managerId) });
}

// PATCH /api/v1/guided-sessions/:id  { stage?, state? }  — the auto-save
export async function patch(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  const body = asRecord(await c.readBody());
  c.json(200, await service.patch(c.params.id ?? "", orgId, managerId, { stage: body.stage, state: body.state }));
}

// POST /api/v1/guided-sessions/:id/complete  — flip to done (Phase 1)
export async function complete(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await internalCaller(c);
  c.json(200, await service.complete(c.params.id ?? "", orgId, managerId));
}
