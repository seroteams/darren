// Superadmin route guard (pre-go-live PG6) — the funnel every cross-company /api/v1/admin/*
// route goes through, so a route can't be added un-gated. Wrap a handler so it runs only for
// the allowlisted superadmin: buildIdentity → requireSuperadmin (401 anonymous, 403 for a
// logged-in non-superadmin, including a normal owner and the dev side-door), then the handler.
//
// Mirrors admin-guard.ts (the owner/admin tooling gate). Distinct on purpose: requireAdmin is
// role-based and per-company; this is allowlist-based and cross-company. The per-company fence
// is untouched — this is a separate, tightly gated path.
//
// The identity lookup is injectable (defaults to Postgres via buildIdentity) so this wrapper
// is unit-testable without a database.

import type { RouteHandler, RequestContext } from "../router.ts";
import { buildIdentity } from "./request-context.ts";
import type { IdentityLookup } from "./request-context.ts";
import { requireSuperadmin } from "./require-auth.ts";

export function requireSuperadminRoute(handler: RouteHandler, lookup?: IdentityLookup): RouteHandler {
  return async (c: RequestContext) => {
    const identity = await buildIdentity(c.req, lookup);
    requireSuperadmin(identity); // 401 anonymous, 403 for anyone not on the allowlist
    return handler(c);
  };
}
