// Read + resolve data access for the Error log (error-log Phase 2 + 4). SELECT reads for
// the list (now incl. details + resolvedAt), plus the ONE write — mark-resolved (Phase 4).
// No insert/delete of error rows here: the capture writer is api/middleware/error-log.ts,
// and purge is a separate script. Reads error_logs across ALL companies (the cross-company
// superadmin read, behind requireSuperadminRoute), LEFT JOINing users + organizations for a
// name + company; LEFT so anonymous / pre-login errors still come back.
//
// The service depends on this interface, so its mapping + the resolve toggle are proven
// against an in-memory fake without a database — same seam as the superadmin service.

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { errorLogs, users, organizations } from "../../../db/schema.ts";

/** One error row as read (createdAt/resolvedAt are Dates; the service turns them into ISO). */
export interface ErrorLogRow {
  id: string;
  environment: "local" | "production";
  source: "api" | "browser";
  email: string | null;
  userName: string | null;
  company: string | null;
  method: string | null;
  path: string;
  status: number | null;
  errorCode: string | null;
  message: string;
  details: { stack?: string; userAgent?: string } | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface ErrorLogReadRepo {
  /** The most recent `limit` errors across every company, newest first. */
  listRecent(limit: number): Promise<ErrorLogRow[]>;
  /** Mark one error resolved (a timestamp) or reopen it (null) — user-triage, Phase 4. */
  setResolved(id: string, at: Date | null): Promise<void>;
}

export const pgErrorLogReadRepo: ErrorLogReadRepo = {
  async listRecent(limit) {
    const db = getDb();
    return db
      .select({
        id: errorLogs.id,
        environment: errorLogs.environment,
        source: errorLogs.source,
        email: errorLogs.email,
        userName: users.name,
        company: organizations.name,
        method: errorLogs.method,
        path: errorLogs.path,
        status: errorLogs.status,
        errorCode: errorLogs.errorCode,
        message: errorLogs.message,
        details: errorLogs.details,
        resolvedAt: errorLogs.resolvedAt,
        createdAt: errorLogs.createdAt,
      })
      .from(errorLogs)
      .leftJoin(users, eq(errorLogs.userId, users.id))
      .leftJoin(organizations, eq(errorLogs.orgId, organizations.id))
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);
  },
  async setResolved(id, at) {
    const db = getDb();
    await db.update(errorLogs).set({ resolvedAt: at }).where(eq(errorLogs.id, id));
  },
};
