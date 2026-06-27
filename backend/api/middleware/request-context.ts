// Who-you-are context (Phase 004 step 2 — shared plumbing). Built once per request
// and handed to services. Phase 004 has NO auth, so every request is anonymous —
// this is the SHAPE the Phase 006 login check fills in; nothing reads it for
// authorization yet.

import type { IncomingMessage } from "node:http";

/** The identity behind a request. */
export interface RequestIdentity {
  userId: string | null; // null = anonymous
  orgId: string | null; // null = no org context yet
  roles: string[]; // [] for now
}

export function anonymousIdentity(): RequestIdentity {
  return { userId: null, orgId: null, roles: [] };
}

/** Build the identity for a request. The slot the real login check drops into in
 *  Phase 006 — for now every request is anonymous, regardless of headers. */
export function buildIdentity(_req: IncomingMessage): RequestIdentity {
  return anonymousIdentity();
}
