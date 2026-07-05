// Thin controller for the Error log screen (error-log Phase 2). Access is enforced at the
// route (superadminV1 in server.ts), so this handler already runs as the allowlisted
// superadmin — no per-handler guard, and the namespace can't be added to un-gated.

import type { RequestContext } from "../../router.ts";
import { errorLogService } from "./error-log.service.ts";

/** GET /api/v1/admin/errors — the most recent errors across every company, newest first. */
export async function list(c: RequestContext): Promise<void> {
  c.json(200, await errorLogService.listRecent());
}
