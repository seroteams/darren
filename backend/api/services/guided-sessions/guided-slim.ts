// The finished-guided-session source for the Phase-6 run-list merge. Decoupled from the list
// services so runs.service + about-me.service inject it as a plain function and stay unit-testable
// with empty fakes (their existing tests never see a guided source, so they stay green untouched).

import { pgGuidedSessionsRepo } from "./guided-sessions.repo.ts";

export interface GuidedSlimRow {
  id: string;
  personId: string;
  personName: string;
  managerId: string;
  completedAt: number; // ms — matches the run lists' lastSeenAt
}

export async function listCompletedGuidedSlim(
  orgId: string,
  filter: { managerId?: string; personIds?: string[] },
): Promise<GuidedSlimRow[]> {
  const rows = await pgGuidedSessionsRepo.listCompletedSlim(orgId, filter);
  return rows.map((r) => ({
    id: r.id,
    personId: r.personId,
    personName: r.personName,
    managerId: r.managerId,
    completedAt: r.completedAt.getTime(),
  }));
}
