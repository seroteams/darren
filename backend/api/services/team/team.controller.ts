// Thin controller for the people-aliases (pre-go-live PG9). Login required, any role,
// fenced to the caller's OWN userId — a manager only ever edits their own Team. Origin
// guards on the mutating routes live in server.ts (mirrors rateMine).

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth } from "../../middleware/require-auth.ts";
import { teamService } from "./team.service.ts";

async function callerUserId(c: RequestContext): Promise<string> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity); // 401 when logged out; no role check
  return identity.userId ?? "";
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
