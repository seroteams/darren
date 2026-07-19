// Thin controller for the people-aliases (pre-go-live PG9) and the people roster
// (people-roster Phase 1). Aliases: login required, any role, fenced to the caller's
// OWN userId — a manager only ever edits their own Team. Roster: manager/admin only
// (members have no roster), fenced to the caller's orgId + managerId in the service.
// Origin guards on the mutating routes live in server.ts (mirrors rateMine).

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { peopleService } from "./people.service.ts";

/** The roster caller — manager/admin only (403 for a member), with org + user ids. */
async function rosterCaller(c: RequestContext): Promise<{ orgId: string; managerId: string }> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity); // 401 logged out; 403 member
  return { orgId: identity.orgId ?? "", managerId: identity.userId ?? "" };
}

// ── People roster (people-roster Phase 1) ──────────────────────────────────────

export async function listPeople(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  c.json(200, await peopleService.list(orgId, managerId));
}

export async function createPerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  const body = (await c.readBody()) as { name?: unknown; role?: unknown; seniority?: unknown } | null;
  c.json(200, await peopleService.create(orgId, managerId, { name: body?.name, role: body?.role, seniority: body?.seniority }));
}

export async function updatePerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  const body = (await c.readBody()) as { name?: unknown; role?: unknown; seniority?: unknown };
  c.json(200, await peopleService.update(c.params.id ?? "", orgId, managerId, body ?? {}));
}

// Hard delete — permanently removes the person and every 1:1 about them. Irreversible;
// the UI gates it behind a type-the-name confirm.
export async function removePerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  c.json(200, await peopleService.remove(c.params.id ?? "", orgId, managerId));
}

// ── Person ↔ member-account link (people-roster Phase 5) ──────────────────────

export async function linkPerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  const body = (await c.readBody()) as { userId?: unknown } | null;
  c.json(200, await peopleService.link(c.params.id ?? "", orgId, managerId, String(body?.userId ?? "")));
}

export async function unlinkPerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  c.json(200, await peopleService.unlink(c.params.id ?? "", orgId, managerId));
}

export async function linkableUsers(c: RequestContext): Promise<void> {
  const { orgId } = await rosterCaller(c);
  c.json(200, await peopleService.linkableUsers(orgId));
}
