// The login-check slot (Phase 004 step 2 — shared plumbing). Phase 004 has NO real
// auth, so this is a no-op pass-through placeholder — it never rejects. Phase 006's
// real check replaces the body with something like:
//   if (!identity.userId) throw unauthenticated();
// Kept as a typed seam now so step-3 controllers can already call it.

import type { RequestIdentity } from "./request-context.ts";

export function requireAuth(_identity: RequestIdentity): void {
  // intentionally empty — no auth in Phase 004 (the slot, not the lock)
}
