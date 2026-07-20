// Internal-tool access guard (admin-live-deploy Phase 1; tightened admin-lockdown Phase 2).
// The internal tooling routes (arcs, role-lexicons, lexicon promotions, heartbeat, regression,
// checks, suggest-fix, pipeline status, library) edit the GLOBAL engine config every customer
// runs on, or expose repo internals — so they are INTERNAL-ADMIN territory (role `admin` OR the
// allowlisted superadmin) on EVERY environment, never a plain `manager`. On the LIVE site they
// tighten further to the allowlisted superadmin only.
//
// (Before Phase 2 the non-live gate was requireAdminRoute, which passed `manager` — the role
// every customer signup gets — so a manager could edit global engine config on any non-live
// deploy. That was the hole; the base is now requireInternalAdminRoute.)
//
// The env is read PER REQUEST (resolveAppEnv), not at wrap time, so tests can flip it
// and a misconfigured boot can't freeze a stale decision in.
//
// Lookup + audit are injectable exactly like the guards this composes (admin-guard.ts,
// superadmin-guard.ts) so it's unit-testable without a database.

import type { RouteHandler, RequestContext } from "../router.ts";
import { resolveAppEnv } from "../../db/env-guard.ts";
import { requireInternalAdminRoute } from "./admin-guard.ts";
import { requireSuperadminRoute } from "./superadmin-guard.ts";
import type { SuperadminAudit } from "./superadmin-guard.ts";
import type { IdentityLookup } from "./request-context.ts";
import { forbidden } from "./http-error.ts";

export function requireInternalToolRoute(
  handler: RouteHandler,
  lookup?: IdentityLookup,
  audit?: SuperadminAudit,
): RouteHandler {
  const asInternalAdmin = requireInternalAdminRoute(handler, lookup);
  const asSuperadmin = audit
    ? requireSuperadminRoute(handler, lookup, audit)
    : requireSuperadminRoute(handler, lookup);
  return (c: RequestContext) => (resolveAppEnv() === "live" ? asSuperadmin(c) : asInternalAdmin(c));
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
