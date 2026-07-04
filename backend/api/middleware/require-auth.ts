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

// The superadmin gate (pre-go-live PG6) — the one intentional wall-crossing. Membership is
// an email allowlist (`SUPERADMIN_EMAILS`, comma-separated) matched against the identity's
// SERVER-RESOLVED email (RequestIdentity.email, from the session lookup) — never a header,
// cookie, or body value the client can set. Both sides go through one normalizer so the
// match can't drift; an empty/absent allowlist means nobody is superadmin. The dev side-door
// identity (dev@seroteams.com) is deliberately off any real allowlist, so it can't satisfy
// this gate even with DEV_AUTOLOGIN on.
export function normalizeEmail(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v || null;
}

// Parsed fresh each call (cheap) so it always reflects the current env — tests set it per-case.
function superadminAllowlist(): Set<string> {
  const set = new Set<string>();
  for (const part of (process.env.SUPERADMIN_EMAILS ?? "").split(",")) {
    const email = normalizeEmail(part);
    if (email) set.add(email);
  }
  return set;
}

export function isSuperadminIdentity(identity: RequestIdentity): boolean {
  const email = normalizeEmail(identity.email);
  if (!email) return false;
  return superadminAllowlist().has(email);
}

export function requireSuperadmin(identity: RequestIdentity): void {
  requireAuth(identity); // 401 before 403 — same order as requireAdmin
  if (!isSuperadminIdentity(identity)) throw forbidden("Superadmins only");
}
