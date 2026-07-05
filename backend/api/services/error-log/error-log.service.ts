// The Error log read service (error-log Phase 2). Shapes the newest error_logs rows into
// the view the superadmin screen renders — newest first, dates as ISO strings. Read-only;
// the capture writer is api/middleware/error-log.ts. Depends on the repo interface so the
// mapping is proven against an in-memory fake, no database (same seam as superadmin).

import { pgErrorLogReadRepo } from "./error-log.repo.ts";
import type { ErrorLogReadRepo, ErrorLogRow } from "./error-log.repo.ts";

/** How many recent errors the screen loads. Small N for the alpha — newest-first, no
 *  pagination yet (parked). */
const DEFAULT_LIMIT = 200;

/** One error as the screen shows it — the row, with the timestamp as an ISO string. */
export interface ErrorLogView {
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
  createdAt: string;
}

export interface ErrorLogService {
  /** The most recent errors across every company, newest first. */
  listRecent(): Promise<{ errors: ErrorLogView[] }>;
}

function toView(r: ErrorLogRow): ErrorLogView {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

export function createErrorLogService(repo: ErrorLogReadRepo = pgErrorLogReadRepo): ErrorLogService {
  return {
    async listRecent() {
      const rows = await repo.listRecent(DEFAULT_LIMIT);
      return { errors: rows.map(toView) };
    },
  };
}

export const errorLogService = createErrorLogService();
