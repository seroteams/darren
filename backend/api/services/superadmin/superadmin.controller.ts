// Thin controller for the superadmin view (pre-go-live PG6). Parse nothing, call the
// service, format the response. Access is enforced at the route (requireSuperadminRoute
// in server.ts), so every handler here already runs as an allowlisted superadmin — no
// per-handler guard, and no route can be added to this namespace un-gated.

import type { RequestContext } from "../../router.ts";
import { notFound } from "../../middleware/http-error.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { superadminService } from "./superadmin.service.ts";

/** GET /api/v1/admin/registered — every company and the people in it. */
export async function registered(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.listRegistered());
}

/** GET /api/v1/admin/pulse — the founder Pulse dashboard payload (admin-live-deploy Phase 3). */
export async function pulse(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.pulse());
}

/** GET /api/v1/admin/runs — every run on the site, attributed, newest-first (pulse-drilldowns). */
export async function adminRuns(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.adminRuns());
}

/** GET /api/v1/admin/users/:id/runs — one user's finished 1:1s (PG8 drilldown). */
export async function userRuns(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.userRuns(c.params.id ?? ""));
}

/** GET /api/v1/admin/guest-runs — the unclaimed guest pile (guest-run Phase 4). */
export async function guestRuns(c: RequestContext): Promise<void> {
  c.json(200, await superadminService.guestRuns());
}

/** GET /api/v1/admin/runs/:id — one finished run's read-only briefing (PG8 Step 3).
 *  Unknown/unfinished → 404 (same answer as any other id, so ids can't be probed). */
export async function runDetail(c: RequestContext): Promise<void> {
  const run = await superadminService.runDetail(c.params.id ?? "");
  if (!run) throw notFound("unknown run");
  c.json(200, run);
}

/** PATCH /api/v1/admin/users/:id/role — change a user's account role (user-management Phase 2).
 *  The route guard already resolved + audited the superadmin; we re-read the identity here only to
 *  stamp the mutation's audit trail with the actor. Validation + guardrail live in the service. */
export async function setRole(c: RequestContext): Promise<void> {
  const actor = await buildIdentity(c.req);
  const body = (await c.readBody()) as { role?: unknown };
  const role = typeof body?.role === "string" ? body.role : "";
  const result = await superadminService.setUserRole(
    { userId: actor.userId, email: actor.email },
    c.params.id ?? "",
    role,
  );
  c.json(200, result);
}

/** POST /api/v1/admin/users/:id/deactivate — switch a user off (user-management Phase 3).
 *  Guardrails + audit live in the service; the actor is stamped from the resolved identity. */
export async function deactivate(c: RequestContext): Promise<void> {
  const actor = await buildIdentity(c.req);
  const result = await superadminService.deactivateUser(
    { userId: actor.userId, email: actor.email },
    c.params.id ?? "",
  );
  c.json(200, result);
}

/** POST /api/v1/admin/users/:id/reactivate — switch a user back on (Phase 3). */
export async function reactivate(c: RequestContext): Promise<void> {
  const actor = await buildIdentity(c.req);
  const result = await superadminService.reactivateUser(
    { userId: actor.userId, email: actor.email },
    c.params.id ?? "",
  );
  c.json(200, result);
}

/** DELETE /api/v1/admin/users/:id — permanently delete a user (user-management Phase 4).
 *  Runs are kept-but-orphaned; guardrails + audit live in the service. */
export async function deleteUser(c: RequestContext): Promise<void> {
  const actor = await buildIdentity(c.req);
  const result = await superadminService.deleteUser(
    { userId: actor.userId, email: actor.email },
    c.params.id ?? "",
  );
  c.json(200, result);
}
