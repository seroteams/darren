// Admin-tooling access guard (admin-access-guard). Wrap a route handler so it runs
// only for a logged-in ADMIN: buildIdentity → requireAdmin (401 when logged out, 403
// for a logged-in non-admin), then the handler. The internal tooling (pipeline, checks,
// regression, arcs, lexicon promotion, role-lexicons, suggest-fix, library) is
// registered through this; the customer prep flow is not.
//
// (Phase 1 shipped a login-only wall; Phase 2 tightened it to the owner/admin role.)
//
// Works under both route shapes: thrown 401/403s are caught by v1Route (one error
// shape) for /api/v1 routes and by the router (legacy { error } shape) for /api aliases.
//
// The identity lookup is injectable (defaults to Postgres via buildIdentity) so this
// wrapper is unit-testable without a database.

import type { RouteHandler, RequestContext } from "../router.ts";
import { buildIdentity } from "./request-context.ts";
import type { IdentityLookup } from "./request-context.ts";
import { requireAdmin } from "./require-auth.ts";

export function requireAdminRoute(handler: RouteHandler, lookup?: IdentityLookup): RouteHandler {
  return async (c: RequestContext) => {
    const identity = await buildIdentity(c.req, lookup);
    requireAdmin(identity); // 401 for anonymous, 403 for a logged-in non-admin
    return handler(c);
  };
}
