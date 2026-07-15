// The org Members page service (members-page Phase 1). Owns one rule: merge the org's login
// accounts and its pending invites into a single list of rows the page renders, each tagged
// active | invited | deactivated. Read-only for now (invite + row actions land in later
// phases). Fenced to the caller's orgId — the controller supplies it, the repo enforces it.

import { pgMembersRepo } from "./members.repo.ts";
import type { MembersRepo } from "./members.repo.ts";

export type MemberStatus = "active" | "invited" | "deactivated";

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
  };
}

export const membersService = createMembersService();
