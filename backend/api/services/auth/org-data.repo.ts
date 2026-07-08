// Org-fenced data reads (Phase 006 Phase 4). Every query filters by the caller's
// orgId, so a company can only ever see its OWN rows — the data wall between
// companies.
//
// Scope now: runs — which live in the `sessions` table (run = session; the old
// separate `runs` table was never written and was dropped in postgres-runtime-data
// Phase 1). The same rule extends to the other tenant tables as their endpoints
// become authenticated. The legacy anonymous admin endpoints still use the
// pre-auth placeholder org until the login UI lands (Phase 7) — they are
// intentionally not re-pointed here, so the admin console keeps working.

import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { sessions } from "../../../db/schema.ts";

export interface RunRow {
  id: string;
  orgId: string;
  label: string | null;
  status: string | null;
  logDir: string;
}

export interface OrgDataRepo {
  /** Runs belonging to this org — and only this org. */
  listRuns(orgId: string): Promise<RunRow[]>;
}

export const pgOrgDataRepo: OrgDataRepo = {
  async listRuns(orgId) {
    const db = getDb();
    const rows = await db.select().from(sessions).where(eq(sessions.orgId, orgId));
    return rows.map((r) => ({
      id: r.sessionKey,
      orgId: r.orgId,
      label: r.runLabel,
      status: r.finished ? "finished" : "open",
      logDir: r.logDir ?? "",
    }));
  },
};

/** The fencing rule in one place: a caller only ever reads their OWN org's runs.
 *  Pure — the isolation test proves it without a database. */
export async function listMyRuns(repo: OrgDataRepo, orgId: string): Promise<RunRow[]> {
  return repo.listRuns(orgId);
}
