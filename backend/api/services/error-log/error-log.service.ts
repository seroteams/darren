// The Error log read + resolve service (error-log Phase 2 + 4). Shapes the newest
// error_logs rows into the view the superadmin screen renders — newest first, dates as ISO
// strings — and toggles a row's resolved state. Depends on the repo interface so the
// mapping + toggle are proven against an in-memory fake, no database (same seam as superadmin).

import { pgErrorLogReadRepo } from "./error-log.repo.ts";
import type { ErrorLogReadRepo, ErrorLogRow } from "./error-log.repo.ts";

/** How many recent errors the screen loads. Small N for the alpha — newest-first, no
 *  pagination yet (parked). */
const DEFAULT_LIMIT = 200;

/** One error as the screen shows it — the row, with the timestamps as ISO strings. */
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
  details: { stack?: string; userAgent?: string } | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ErrorLogService {
  /** The most recent errors across every company, newest first. */
  listRecent(): Promise<{ errors: ErrorLogView[] }>;
  /** Mark one error resolved (true) or reopen it (false). Returns the new state. */
  resolve(id: string, resolved: boolean): Promise<{ id: string; resolved: boolean }>;
}

function toView(r: ErrorLogRow): ErrorLogView {
  return { ...r, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null };
}

export function createErrorLogService(repo: ErrorLogReadRepo = pgErrorLogReadRepo): ErrorLogService {
  return {
    async listRecent() {
      const rows = await repo.listRecent(DEFAULT_LIMIT);
      return { errors: rows.map(toView) };
    },
    async resolve(id, resolved) {
      await repo.setResolved(id, resolved ? new Date() : null);
      return { id, resolved };
    },
  };
}

export const errorLogService = createErrorLogService();
