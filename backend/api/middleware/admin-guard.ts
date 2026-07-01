// Admin-tooling access guard (admin-access-guard Phase 1). Wrap a route handler so
// it runs only for a logged-in caller: buildIdentity → requireAuth (401 when logged
// out), then the handler. The internal tooling (pipeline, checks, regression, arcs,
// lexicon promotion, role-lexicons, suggest-fix, library) is registered through this;
// the customer prep flow is not. The owner/admin ROLE check lands in Phase 2.
//
// Works under both route shapes: thrown 401s are caught by v1Route (one error shape)
// for /api/v1 routes and by the router (legacy { error } shape) for /api aliases.
//
// The identity lookup is injectable (defaults to Postgres via buildIdentity) so this
// wrapper is unit-testable without a database.

import type { RouteHandler, RequestContext } from "../router.ts";
import { buildIdentity } from "./request-context.ts";
import type { IdentityLookup } from "./request-context.ts";
import { requireAuth } from "./require-auth.ts";

export function requireLoginRoute(handler: RouteHandler, lookup?: IdentityLookup): RouteHandler {
  return async (c: RequestContext) => {
    const identity = await buildIdentity(c.req, lookup);
    requireAuth(identity); // throws 401 for an anonymous caller
    return handler(c);
  };
}
