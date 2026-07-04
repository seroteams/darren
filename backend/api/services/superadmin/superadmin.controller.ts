// Thin controller for the superadmin view (pre-go-live PG6). Parse nothing, call the
// service, format the response. Access is enforced at the route (requireSuperadminRoute
// in server.ts), so every handler here already runs as an allowlisted superadmin — no
// per-handler guard, and no route can be added to this namespace un-gated.

import type { RequestContext } from "../../router.ts";
import { superadminService } from "./superadmin.service.ts";

/** GET /api/v1/admin/registered — every company and the people in it, with the
 *  return-visit signal and the alpha rating summary. The clock is injected here so the
 *  service's week buckets stay deterministic under test. */
export async function registered(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.listRegistered(new Date()));
}
