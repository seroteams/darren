// Thin controller for the org Members page (members-page Phase 1). Manager/admin only
// (requireAdmin — a plain member has no workspace to manage, 403), fenced to the caller's
// own orgId. Read-only in this phase; invite + row-action endpoints arrive in later phases.

import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { membersService } from "./members.service.ts";

/** The members caller — manager/admin only (403 for a member), with their org id. */
async function membersCaller(c: RequestContext): Promise<{ orgId: string }> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity); // 401 logged out; 403 member
  return { orgId: identity.orgId ?? "" };
}

// GET /api/v1/members — the caller's org: login accounts + pending invites, tagged.
export async function listMembers(c: RequestContext): Promise<void> {
  const { orgId } = await membersCaller(c);
  c.json(200, await membersService.list(orgId));
}
