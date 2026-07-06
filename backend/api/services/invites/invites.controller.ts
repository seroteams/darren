// Thin controller for the join flow (member-onboarding-invites). Creating an invite is
// manager/admin-only and fenced to their own roster person; preview + accept are PUBLIC
// (the invitee has no account yet) — possession of the one-time token IS the credential,
// same trust model as the guest-run claim. Accept logs the new member straight in (same
// cookie dance as login), so they land on "Your 1:1s" with zero extra steps.

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { RequestContext } from "../../router.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { sessionCookie } from "../../middleware/cookies.ts";
import { pgAuthSessionRepo } from "../auth/auth.repo.ts";
import { createInvitesService } from "./invites.service.ts";
import { pgInvitesRepo } from "./invites.repo.ts";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // mirrors auth.controller

const service = createInvitesService(pgInvitesRepo, {
  hash: (password) => bcrypt.hash(password, 10),
});

// POST /api/v1/team/people/:id/invite — { email } → { link, expiresAt }. The raw token
// leaves the server exactly once, inside the returned link; only its hash is stored.
export async function createInvite(c: RequestContext): Promise<void> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity); // managers/admins invite; members don't have a roster
  const body = (await c.readBody()) as { email?: unknown } | null;
  const { token, expiresAt } = await service.create(
    identity.orgId ?? "",
    identity.userId ?? "",
    c.params.id ?? "",
    body?.email,
  );
  c.json(201, { link: `/join/${token}`, expiresAt });
}

// GET /api/v1/invites/:token — public preview for the join page.
export async function previewInvite(c: RequestContext): Promise<void> {
  c.json(200, await service.preview(c.params.token));
}

// POST /api/v1/invites/:token/accept — { name, password } → creates the member, links the
// roster person, burns the invite, and sets the login cookie.
export async function acceptInvite(c: RequestContext): Promise<void> {
  const body = (await c.readBody()) as { name?: unknown; password?: unknown } | null;
  const { user } = await service.accept(c.params.token, { name: body?.name, password: body?.password });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await pgAuthSessionRepo.create({ token, userId: user.id, orgId: user.orgId, expiresAt });
  c.res.setHeader("Set-Cookie", sessionCookie(token, SESSION_TTL_SECONDS));

  c.json(201, { user });
}
