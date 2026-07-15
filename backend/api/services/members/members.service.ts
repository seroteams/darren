// The org Members page service (members-page Phase 1). Owns one rule: merge the org's login
// accounts and its pending invites into a single list of rows the page renders, each tagged
// active | invited | deactivated. Read-only for now (invite + row actions land in later
// phases). Fenced to the caller's orgId — the controller supplies it, the repo enforces it.

import { pgMembersRepo } from "./members.repo.ts";
import type { MembersRepo } from "./members.repo.ts";
import { isActiveLead } from "./account-guards.ts";
import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";
import { isSuperadminEmail } from "../../middleware/require-auth.ts";

export type MemberStatus = "active" | "invited" | "deactivated";

/** Who is performing a mutation — for the last-lead check + the audit trail. */
export interface MemberActor {
  userId: string | null;
  email: string | null;
}

/** Roles an org admin may set from the Members page — admin stays reserved for internal Sero. */
const SETTABLE_ROLES = new Set(["manager", "member"]);

/** One row on the Members page — either a real login account or a pending invite. */
export interface MemberRow {
  kind: "account" | "invite";
  /** The user id (account) or invitation id (invite). */
  id: string;
  /** Blank for a pending invite — no name exists until they accept. */
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
}

export interface MembersService {
  list(orgId: string): Promise<{ members: MemberRow[] }>;
  setRole(orgId: string, actor: MemberActor, targetId: string, role: unknown): Promise<{ id: string; role: string }>;
  deactivate(orgId: string, actor: MemberActor, targetId: string): Promise<{ id: string; deactivated: true }>;
  reactivate(orgId: string, actor: MemberActor, targetId: string): Promise<{ id: string; deactivated: false }>;
}

// Active first, then still-pending invites, then switched-off accounts.
const STATUS_RANK: Record<MemberStatus, number> = { active: 0, invited: 1, deactivated: 2 };

export function createMembersService(repo: MembersRepo = pgMembersRepo): MembersService {
  return {
    async list(orgId) {
      const [accounts, invites] = await Promise.all([
        repo.listOrgUsers(orgId),
        repo.listPendingInvites(orgId),
      ]);
      const rows: MemberRow[] = [
        ...accounts.map((u): MemberRow => ({
          kind: "account",
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.deactivatedAt ? "deactivated" : "active",
        })),
        ...invites.map((i): MemberRow => ({
          kind: "invite",
          id: i.id,
          name: "",
          email: i.email,
          role: i.role,
          status: "invited",
        })),
      ];
      rows.sort((a, b) => {
        const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (byStatus !== 0) return byStatus;
        return (a.name || a.email).localeCompare(b.name || b.email);
      });
      return { members: rows };
    },

    // Find the target WITHIN the caller's own org (listOrgUsers is org-fenced), so a cross-org
    // id simply isn't found → 404. Never a "forbidden" that would confirm the account exists.
    async setRole(orgId, actor, targetId, roleRaw) {
      const role = String(roleRaw ?? "").trim().toLowerCase();
      if (!SETTABLE_ROLES.has(role)) throw badRequest("Role must be manager or member.");
      const users = await repo.listOrgUsers(orgId);
      const target = users.find((u) => u.id === targetId);
      if (!target) throw notFound("member not found");
      // Never leave the workspace with no active manager: block demoting its last active lead.
      if (isActiveLead(target) && role === "member" && users.filter(isActiveLead).length <= 1) {
        throw conflict("This is the workspace's only manager — make someone else a manager first.");
      }
      await repo.updateRole(targetId, role);
      await repo.writeAudit(actor.userId, "members.setRole", { target: targetId, from: target.role, to: role });
      return { id: targetId, role };
    },

    async deactivate(orgId, actor, targetId) {
      const users = await repo.listOrgUsers(orgId);
      const target = users.find((u) => u.id === targetId);
      if (!target) throw notFound("member not found");
      if (actor.userId && actor.userId === targetId) throw conflict("You can't switch off your own account.");
      if (isSuperadminEmail(target.email)) throw conflict("This account can't be deactivated.");
      if (isActiveLead(target) && users.filter(isActiveLead).length <= 1) {
        throw conflict("This is the workspace's only active manager — activate or promote someone else first.");
      }
      await repo.setDeactivated(targetId, new Date());
      await repo.revokeSessions(targetId); // kick them now
      await repo.writeAudit(actor.userId, "members.deactivate", { target: targetId, was: target.role });
      return { id: targetId, deactivated: true };
    },

    async reactivate(orgId, actor, targetId) {
      const users = await repo.listOrgUsers(orgId);
      const target = users.find((u) => u.id === targetId);
      if (!target) throw notFound("member not found");
      await repo.setDeactivated(targetId, null);
      await repo.writeAudit(actor.userId, "members.reactivate", { target: targetId });
      return { id: targetId, deactivated: false };
    },
  };
}

export const membersService = createMembersService();
