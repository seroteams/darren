// Internal-admin route guard (admin-lockdown Phase 2). Wrap a route handler so it runs
// only for role `admin` OR the allowlisted superadmin — a plain `manager` does NOT pass,
// on any environment. The internal toolset (arcs, lexicons, library, persona runs…) is
// registered through this (via internal-tool-guard); per-company manager features gate
// themselves in their controllers with requireAdmin.
//
// Works under both route shapes: thrown 401/403s are caught by v1Route (one error
// shape) for /api/v1 routes and by the router (legacy { error } shape) for /api aliases.
//
// The identity lookup is injectable (defaults to Postgres via buildIdentity) so this
// wrapper is unit-testable without a database.

import type { RouteHandler, RequestContext } from "../router.ts";
import { buildIdentity } from "./request-context.ts";
import type { IdentityLookup } from "./request-context.ts";
import { requireInternalAdmin } from "./require-auth.ts";

export function requireInternalAdminRoute(handler: RouteHandler, lookup?: IdentityLookup): RouteHandler {
  return async (c: RequestContext) => {
    const identity = await buildIdentity(c.req, lookup);
    requireInternalAdmin(identity); // 401 anonymous, 403 for a manager/member
    return handler(c);
  };
}
