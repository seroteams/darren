// Internal-tool access guard (admin-live-deploy Phase 1). The internal tooling routes
// (arcs, role-lexicons, lexicon promotions, heartbeat, regression, checks, suggest-fix,
// pipeline status, library) are manager/admin territory in LOCAL dev — but on the LIVE
// site those same routes edit the GLOBAL engine config every customer runs on, so live
// tightens them to the allowlisted superadmin only.
//
// The env is read PER REQUEST (resolveAppEnv), not at wrap time, so tests can flip it
// and a misconfigured boot can't freeze a stale decision in.
//
// Lookup + audit are injectable exactly like the guards this composes (admin-guard.ts,
// superadmin-guard.ts) so it's unit-testable without a database.

import type { RouteHandler, RequestContext } from "../router.ts";
import { resolveAppEnv } from "../../db/env-guard.ts";
import { requireAdminRoute } from "./admin-guard.ts";
import { requireSuperadminRoute } from "./superadmin-guard.ts";
import type { SuperadminAudit } from "./superadmin-guard.ts";
import type { IdentityLookup } from "./request-context.ts";
import { forbidden } from "./http-error.ts";

export function requireInternalToolRoute(
  handler: RouteHandler,
  lookup?: IdentityLookup,
  audit?: SuperadminAudit,
): RouteHandler {
  const asAdmin = requireAdminRoute(handler, lookup);
  const asSuperadmin = audit
    ? requireSuperadminRoute(handler, lookup, audit)
    : requireSuperadminRoute(handler, lookup);
  return (c: RequestContext) => (resolveAppEnv() === "live" ? asSuperadmin(c) : asAdmin(c));
}

/** Shut a route on the live site for EVERYONE (superadmin included) — for endpoints that
 *  spend money or write test data (persona-runs). Local passes straight through; compose
 *  with the normal gate for the local-side auth. */
export function blockOnLive(message: string, handler: RouteHandler): RouteHandler {
  return async (c: RequestContext) => {
    if (resolveAppEnv() === "live") throw forbidden(message);
    return handler(c);
  };
}
