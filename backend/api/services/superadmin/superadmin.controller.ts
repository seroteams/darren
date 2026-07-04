// Thin controller for the superadmin view (pre-go-live PG6). Parse nothing, call the
// service, format the response. Access is enforced at the route (requireSuperadminRoute
// in server.ts), so every handler here already runs as an allowlisted superadmin — no
// per-handler guard, and no route can be added to this namespace un-gated.

import type { RequestContext } from "../../router.ts";
import { superadminService } from "./superadmin.service.ts";

/** GET /api/v1/admin/registered — every company and the people in it. */
export async function registered(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.listRegistered());
}

/** GET /api/v1/admin/users/:id/runs — one user's finished 1:1s (PG8 drilldown). */
export async function userRuns(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.userRuns(c.params.id ?? ""));
}
