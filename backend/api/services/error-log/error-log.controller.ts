// Thin controller for the Error log (error-log Phase 2 + 3 + 4). `list` + `resolve` are
// enforced at the route (superadminV1 in server.ts), so they already run as the allowlisted
// superadmin. `report` is the app's own write path (POST /api/v1/errors), gated only by
// origin + rate-limit at the route; it records a client-side error best-effort.

import type { RequestContext } from "../../router.ts";
import { badRequest } from "../../middleware/http-error.ts";
import { reportBrowserError } from "../../middleware/error-log.ts";
import { errorLogService } from "./error-log.service.ts";

/** GET /api/v1/admin/errors — the most recent errors across every company, newest first. */
export async function list(c: RequestContext): Promise<void> {
  c.json(200, await errorLogService.listRecent());
}

/** PATCH /api/v1/admin/errors/:id/resolve — mark an error resolved (or reopen it). Body
 *  { resolved?: boolean }, defaults to true. Superadmin-gated + origin-guarded at the route. */
export async function resolve(c: RequestContext): Promise<void> {
  const body = (await c.readBody()) as { resolved?: unknown };
  const resolved = typeof body?.resolved === "boolean" ? body.resolved : true;
  c.json(200, await errorLogService.resolve(c.params.id ?? "", resolved));
}

/** POST /api/v1/errors — the app reports a client-side error (a crash / failed load). Not
 *  superadmin-gated; any visitor's own error is recorded (identity from the cookie, or
 *  anonymous). Always 200 once the message is valid — recording is best-effort so the
 *  client never retry-storms. */
export async function report(c: RequestContext): Promise<void> {
  const body = (await c.readBody()) as { message?: unknown; path?: unknown };
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) throw badRequest("A message is required.");
  const path = typeof body?.path === "string" ? body.path : "(unknown)";
  await reportBrowserError(c.req, { message, path });
  c.json(200, { ok: true });
}
