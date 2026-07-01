// Who-you-are context (Phase 006 Phase 3 — the login check is now real). Built per
// request from the session cookie. The dev side-door is hard-gated: it can only ever
// act outside production.

import type { IncomingMessage } from "node:http";
import { readCookie, SESSION_COOKIE } from "./cookies.ts";
import { pgAuthSessionRepo } from "../services/auth/auth.repo.ts";
import type { SessionIdentity } from "../services/auth/auth.repo.ts";

/** The identity behind a request. */
export interface RequestIdentity {
  userId: string | null; // null = anonymous
  orgId: string | null; // null = no org context yet
  roles: string[]; // [] when anonymous
  email: string | null; // null when anonymous
  name: string | null; // null when anonymous
}

export function anonymousIdentity(): RequestIdentity {
  return { userId: null, orgId: null, roles: [], email: null, name: null };
}

/** The seeded identity the dev side-door lands you in as. Synthetic on purpose —
 *  Phase 3 doesn't fence data on it; Phase 4 will point it at a real dev org. */
function devIdentity(): RequestIdentity {
  return { userId: "dev-user", orgId: "dev-org", roles: ["owner"], email: "dev@seroteams.com", name: "Dev User" };
}

/** How buildIdentity looks a session token up. Defaults to Postgres; injectable so
 *  tests run without a database. */
export type IdentityLookup = (token: string) => Promise<SessionIdentity | null>;

/** Build the identity for a request.
 *
 *  Order matters: the dev side-door is checked FIRST and is dead in production. The
 *  gate is `NODE_ENV !== 'production' && DEV_AUTOLOGIN` — in production the branch is
 *  skipped no matter what DEV_AUTOLOGIN says, so the bypass can never ship. */
export async function buildIdentity(
  req: IncomingMessage,
  lookup: IdentityLookup = pgAuthSessionRepo.findIdentityByToken,
): Promise<RequestIdentity> {
  // Dev side-door — NEVER in production (hard gate, see phase-3.md "The one rule").
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTOLOGIN) {
    return devIdentity();
  }

  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return anonymousIdentity();

  const found = await lookup(token);
  if (!found) return anonymousIdentity();
  return { userId: found.userId, orgId: found.orgId, roles: found.roles, email: found.email, name: found.name };
}
