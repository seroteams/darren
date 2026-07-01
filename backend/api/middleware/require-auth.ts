// The login-check (Phase 006 Phase 3 — now real). Throws a 401 when the request has
// no logged-in user; protected routes call it after buildIdentity.

import type { RequestIdentity } from "./request-context.ts";
import { unauthenticated, forbidden } from "./http-error.ts";

export function requireAuth(identity: RequestIdentity): void {
  if (!identity.userId) throw unauthenticated();
}

// The admin-only gate (admin-access-guard Phase 2). A logged-out caller is 401 (that's
// "sign in", not "forbidden"); a logged-in non-admin is 403. The internal tooling sits
// behind this; the customer prep flow does not. Roles come from the identity (owner is
// what every signup gets today; admin is reserved for later).
const ADMIN_ROLES = ["owner", "admin"];

export function isAdminIdentity(identity: RequestIdentity): boolean {
  return identity.roles.some((r) => ADMIN_ROLES.includes(r));
}

export function requireAdmin(identity: RequestIdentity): void {
  requireAuth(identity); // 401 before 403 — never leak "forbidden" to a logged-out caller
  if (!isAdminIdentity(identity)) throw forbidden("Admins only");
}
