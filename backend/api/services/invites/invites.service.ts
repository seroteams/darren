// The join flow (member-onboarding-invites) — the service. A manager invites one of their
// roster people by email; Sero mints a ONE-TIME join link and emails it to the invitee
// (see the controller; the link is also returned so the manager can resend it if needed).
// Opening it shows who invited you where; accepting creates the
// member account in that org and auto-links the roster row (people.user_id), so "Your 1:1s"
// works from the first login. Token rules (mirrors user-management P5): single-use (status
// flips on accept), expiring (7 days), stored HASHED (sha256) — the raw token exists only
// in the returned link and is never logged or persisted.

import { createHash, randomBytes } from "node:crypto";
import { pgInvitesRepo } from "./invites.repo.ts";
import type { InvitesRepo, InviteRow } from "./invites.repo.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD = 8; // same floor as auth.service
const INVALID = "That invite link isn't valid anymore — ask your manager for a fresh one.";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

function cleanEmail(v: unknown): string {
  const email = String(v ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length < 5) throw badRequest("A real email address is required");
  return email;
}

// Roles an org admin may hand out from the Members page. "admin" is reserved for internal Sero,
// so it's deliberately NOT offered here — a workspace admin can make managers and members only.
const ORG_INVITE_ROLES = new Set(["manager", "member"]);
function cleanRole(v: unknown): string {
  const role = String(v ?? "").trim().toLowerCase();
  if (!ORG_INVITE_ROLES.has(role)) throw badRequest("Pick a role: manager or member");
  return role;
}

export function createInvitesService(repo: InvitesRepo = pgInvitesRepo, hasher: PasswordHasher) {
  /** The live (pending + unexpired) invite behind a raw token, or a plain-words 404. */
  async function liveInvite(token: unknown): Promise<InviteRow> {
    const raw = String(token ?? "");
    if (!raw) throw notFound(INVALID);
    const row = await repo.findByTokenHash(sha256(raw));
    if (!row || row.status !== "pending" || row.expiresAt.getTime() < Date.now()) throw notFound(INVALID);
    return row;
  }

  return {
    /** Mint an invite for the caller's own roster person. Returns the raw token exactly
     *  once — the caller composes the /join link; nothing else ever sees it. */
    async create(orgId: string, managerId: string, personId: string, emailRaw: unknown) {
      const person = await repo.findPersonForManager(personId, orgId, managerId);
      if (!person) throw notFound("Person not found");
      const email = cleanEmail(emailRaw);
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      // A roster invite always mints a member (they see their own 1:1s) — role fixed here.
      await repo.insertInvite({ orgId, email, role: "member", invitedBy: managerId, expiresAt, tokenHash: sha256(token), personId: person.id });
      return { token, expiresAt };
    },

    /** Mint a WORKSPACE-level invite from the Members page — no roster person, a chosen role.
     *  Returns the raw token exactly once (the caller composes the /join link + emails it). */
    async createForOrg(orgId: string, invitedBy: string, emailRaw: unknown, roleRaw: unknown) {
      const email = cleanEmail(emailRaw);
      const role = cleanRole(roleRaw);
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      await repo.insertInvite({ orgId, email, role, invitedBy, expiresAt, tokenHash: sha256(token) });
      return { token, expiresAt };
    },

    /** What the join page shows before any account exists. */
    async preview(token: unknown) {
      const inv = await liveInvite(token);
      return {
        orgName: await repo.orgName(inv.orgId),
        inviterName: inv.invitedBy ? await repo.userName(inv.invitedBy) : null,
        personName: inv.personId ? await repo.personName(inv.personId) : null,
        email: inv.email,
      };
    },

    /** Create the member account in the inviter's org, link the roster person, burn the
     *  invite. The controller logs the new member in (cookie) — same as login. */
    async accept(token: unknown, input: { name?: unknown; password?: unknown }) {
      const inv = await liveInvite(token);
      const password = String(input.password ?? "");
      if (password.length < MIN_PASSWORD) throw badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
      if (await repo.findUserByEmail(inv.email)) {
        throw badRequest("That email already has an account — log in instead");
      }
      const name = String(input.name ?? "").trim().slice(0, 80) || inv.email.split("@")[0]!;
      const user = await repo.createMemberUser({
        orgId: inv.orgId,
        email: inv.email,
        name,
        passwordHash: await hasher.hash(password),
        // The role chosen at invite time (members-page): member for roster invites, member OR
        // manager for workspace invites. Falls back to member if an older invite has none.
        role: inv.role || "member",
      });
      if (inv.personId) await repo.linkPersonUser(inv.personId, user.id);
      await repo.markAccepted(inv.id);
      return { user };
    },
  };
}
