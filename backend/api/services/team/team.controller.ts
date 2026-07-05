// Thin controller for the people-aliases (pre-go-live PG9) and the people roster
// (people-roster Phase 1). Aliases: login required, any role, fenced to the caller's
// OWN userId — a manager only ever edits their own Team. Roster: manager/admin only
// (members have no roster), fenced to the caller's orgId + managerId in the service.
// Origin guards on the mutating routes live in server.ts (mirrors rateMine).

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth, requireAdmin } from "../../middleware/require-auth.ts";
import { teamService } from "./team.service.ts";
import { peopleService } from "./people.service.ts";

async function callerUserId(c: RequestContext): Promise<string> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity); // 401 when logged out; no role check
  return identity.userId ?? "";
}

/** The roster caller — manager/admin only (403 for a member), with org + user ids. */
async function rosterCaller(c: RequestContext): Promise<{ orgId: string; managerId: string }> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity); // 401 logged out; 403 member
  return { orgId: identity.orgId ?? "", managerId: identity.userId ?? "" };
}

export async function aliases(c: RequestContext): Promise<void> {
  c.json(200, teamService.getAliases(await callerUserId(c)));
}

export async function merge(c: RequestContext): Promise<void> {
  const userId = await callerUserId(c);
  const body = (await c.readBody()) as { from?: unknown; into?: unknown };
  c.json(200, teamService.merge(userId, body?.from, body?.into));
}

export async function rename(c: RequestContext): Promise<void> {
  const userId = await callerUserId(c);
  const body = (await c.readBody()) as { key?: unknown; name?: unknown };
  c.json(200, teamService.rename(userId, body?.key, body?.name));
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

export async function mergePerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  const body = (await c.readBody()) as { intoId?: unknown };
  c.json(200, await peopleService.merge(c.params.id ?? "", orgId, managerId, String(body?.intoId ?? "")));
}

export async function archivePerson(c: RequestContext): Promise<void> {
  const { orgId, managerId } = await rosterCaller(c);
  c.json(200, await peopleService.archive(c.params.id ?? "", orgId, managerId));
}
