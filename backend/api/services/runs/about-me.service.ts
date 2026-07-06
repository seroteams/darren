// "1:1s about me" (people-roster Phase 5) — the member read path. A member linked to a
// roster person (people.user_id) sees the 1:1s ABOUT them: meeting type + when + which
// manager. LIST-ONLY by ruling: manager notes are sensitive (no-inference ruling), so the
// row never carries notes, briefing, ratings, or even the creator's raw id — any richer
// member view is Carl's parked call (`member-run-visibility`). Deps are injected (roster
// lookup, run walk, org users) so the logic is unit-tested without a database or disk.

import { pgPeopleRepo } from "../team/people.repo.ts";
import { listFinishedRunsAboutPerson } from "../../../engine/run-history.ts";

export interface AboutMeRun {
  id: string;
  meetingType: string;
  lastSeenAt: number;
  completedAt: number | null;
  managerName: string | null;
}

export interface AboutMeDeps {
  findByLinkedUser(userId: string, orgId: string): Promise<{ id: string }[]>;
  listRunsAboutPerson(
    orgId: string,
    personIds: string[],
  ): { id: string; meetingType: string; lastSeenAt: number; completedAt: number | null; userId: string | null }[];
  listOrgUsers(orgId: string): Promise<{ id: string; name: string }[]>;
}

const defaultDeps: AboutMeDeps = {
  findByLinkedUser: (userId, orgId) => pgPeopleRepo.findByLinkedUser(userId, orgId),
  listRunsAboutPerson: (orgId, personIds) => listFinishedRunsAboutPerson(orgId, personIds),
  listOrgUsers: (orgId) => pgPeopleRepo.listOrgUsers(orgId),
};

export function createAboutMeService(deps: AboutMeDeps = defaultDeps) {
  return {
    async aboutMe(orgId: string | null | undefined, userId: string | null | undefined): Promise<{ runs: AboutMeRun[] }> {
      if (!orgId || !userId) return { runs: [] };
      const linked = await deps.findByLinkedUser(userId, orgId);
      if (linked.length === 0) return { runs: [] };
      const rows = deps.listRunsAboutPerson(orgId, linked.map((p) => p.id));
      if (rows.length === 0) return { runs: [] };
      const names = new Map((await deps.listOrgUsers(orgId)).map((u) => [u.id, u.name]));
      return {
        runs: rows.map((r) => ({
          id: r.id,
          meetingType: r.meetingType,
          lastSeenAt: r.lastSeenAt,
          completedAt: r.completedAt,
          managerName: (r.userId && names.get(r.userId)) || null,
        })),
      };
    },
  };
}

export const aboutMeService = createAboutMeService();
