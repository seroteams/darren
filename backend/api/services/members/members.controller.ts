// Thin controller for the org Members page (members-page Phase 1). Manager/admin only
// (requireAdmin — a plain member has no workspace to manage, 403), fenced to the caller's
// own orgId. Read-only in this phase; invite + row-action endpoints arrive in later phases.

import type { IncomingMessage } from "node:http";
import bcrypt from "bcryptjs";
import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { membersService } from "./members.service.ts";
import { createInvitesService } from "../invites/invites.service.ts";
import { pgInvitesRepo } from "../invites/invites.repo.ts";
import { notifyInviteeOfInvite } from "../notifications/notifications.service.ts";

const invites = createInvitesService(pgInvitesRepo, { hash: (pw) => bcrypt.hash(pw, 10) });

/** The members caller — manager/admin only (403 for a member), with their org id + actor. */
async function membersCaller(c: RequestContext): Promise<{ orgId: string; actor: { userId: string | null; email: string | null } }> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity); // 401 logged out; 403 member
  return { orgId: identity.orgId ?? "", actor: { userId: identity.userId ?? null, email: identity.email ?? null } };
}

// The public origin, so the emailed /join link is a full clickable URL. Mirrors the helper in
// invites.controller — prefer APP_BASE_URL, else derive from the request the admin just made.
function requestBaseUrl(req: IncomingMessage): string {
  const envBase = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (envBase) return envBase;
  const fwdProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0]!.trim();
  const proto = fwdProto || ((req.socket as { encrypted?: boolean }).encrypted ? "https" : "http");
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "").split(",")[0]!.trim();
  return host ? `${proto}://${host}` : "";
}

// GET /api/v1/members — the caller's org: login accounts + pending invites, tagged.
export async function listMembers(c: RequestContext): Promise<void> {
  const { orgId } = await membersCaller(c);
  c.json(200, await membersService.list(orgId));
}

// POST /api/v1/members/invite — { email, role } → a workspace-level invite (no roster person).
// Reuses the invite engine (one-time hashed token, 7-day TTL) + emails the /join link. The raw
// token leaves the server exactly once, inside the returned link; only its hash is stored.
export async function inviteMember(c: RequestContext): Promise<void> {
  const { orgId, actor } = await membersCaller(c);
  const body = (await c.readBody()) as { email?: unknown; role?: unknown } | null;
  const { token, expiresAt } = await invites.createForOrg(orgId, actor.userId ?? "", body?.email, body?.role);
  const link = `/join/${token}`;
  const base = requestBaseUrl(c.req);
  const joinUrl = base ? `${base}${link}` : link;
  // Email the invitee their link — fire-and-forget; a failed email never blocks the invite
  // (the link is also returned so the admin can copy it). Not awaited.
  void invites
    .preview(token)
    .then((p) => notifyInviteeOfInvite({ to: p.email, inviterName: p.inviterName, orgName: p.orgName, joinUrl }))
    .catch((err) => console.warn(`[member-invite-email] not sent: ${err instanceof Error ? err.message : String(err)}`));
  c.json(201, { link, expiresAt });
}

// PATCH /api/v1/members/:id/role — { role } (manager | member). Org-fenced + last-lead guard.
export async function setMemberRole(c: RequestContext): Promise<void> {
  const { orgId, actor } = await membersCaller(c);
  const body = (await c.readBody()) as { role?: unknown } | null;
  c.json(200, await membersService.setRole(orgId, actor, c.params.id ?? "", body?.role));
}

// POST /api/v1/members/:id/deactivate — switch off a login (kicks live sessions). Org-fenced.
export async function deactivateMember(c: RequestContext): Promise<void> {
  const { orgId, actor } = await membersCaller(c);
  c.json(200, await membersService.deactivate(orgId, actor, c.params.id ?? ""));
}

// POST /api/v1/members/:id/reactivate — restore a switched-off login. Org-fenced.
export async function reactivateMember(c: RequestContext): Promise<void> {
  const { orgId, actor } = await membersCaller(c);
  c.json(200, await membersService.reactivate(orgId, actor, c.params.id ?? ""));
}

// DELETE /api/v1/members/invitations/:id — revoke a pending invite (org-fenced). Old link dies.
export async function revokeMemberInvite(c: RequestContext): Promise<void> {
  const { orgId } = await membersCaller(c);
  c.json(200, await invites.revokeForOrg(orgId, c.params.id ?? ""));
}

// POST /api/v1/members/invitations/:id/resend — mint a fresh token + re-email; old link dies.
export async function resendMemberInvite(c: RequestContext): Promise<void> {
  const { orgId } = await membersCaller(c);
  const { token, expiresAt } = await invites.resendForOrg(orgId, c.params.id ?? "");
  const link = `/join/${token}`;
  const base = requestBaseUrl(c.req);
  const joinUrl = base ? `${base}${link}` : link;
  void invites
    .preview(token)
    .then((p) => notifyInviteeOfInvite({ to: p.email, inviterName: p.inviterName, orgName: p.orgName, joinUrl }))
    .catch((err) => console.warn(`[member-invite-resend] not sent: ${err instanceof Error ? err.message : String(err)}`));
  c.json(201, { link, expiresAt });
}
