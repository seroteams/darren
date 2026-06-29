// The login-check (Phase 006 Phase 3 — now real). Throws a 401 when the request has
// no logged-in user; protected routes call it after buildIdentity.

import type { RequestIdentity } from "./request-context.ts";
import { unauthenticated } from "./http-error.ts";

export function requireAuth(identity: RequestIdentity): void {
  if (!identity.userId) throw unauthenticated();
}
