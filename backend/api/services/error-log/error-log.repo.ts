// Read-only data access for the Error log screen (error-log Phase 2). SELECT-only by
// construction — no insert/update/delete here (the capture writer is
// api/middleware/error-log.ts; Phase 4 adds detail + mark-resolved). Reads error_logs
// across ALL companies — the cross-company superadmin read, reachable only behind
// requireSuperadminRoute — LEFT JOINing users + organizations so a row can show a name +
// company without a second lookup. The joins are LEFT on purpose: anonymous / pre-login
// errors (null user/org) still come back.
//
// The service depends on this interface, so its mapping is proven against an in-memory
// fake without a database — same seam as the superadmin service.

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { errorLogs, users, organizations } from "../../../db/schema.ts";

/** One error row as read (createdAt is a Date; the service turns it into an ISO string). */
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
  createdAt: Date;
}

export interface ErrorLogReadRepo {
  /** The most recent `limit` errors across every company, newest first. */
  listRecent(limit: number): Promise<ErrorLogRow[]>;
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
        createdAt: errorLogs.createdAt,
      })
      .from(errorLogs)
      .leftJoin(users, eq(errorLogs.userId, users.id))
      .leftJoin(organizations, eq(errorLogs.orgId, organizations.id))
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);
  },
};
