// Admin-shell serving guard (admin-lockdown Phase 1). The admin console bundle is served
// under /admin, but the STATIC handler has no identity logic — so before it ever streams a
// byte, this decides who may load the shell at all. Internal only (role `admin` OR the
// allowlisted superadmin); everyone else — a manager, a member, a logged-out visitor — is
// 302'd to the customer app at "/". The audit that motivated this: the shell was handed to
// anyone, and the only role checks were cosmetic client-side bounces inside the bundle.
//
// This gates the SHELL (the HTML/JS download). The DATA behind it stays independently gated:
// /api/v1/admin/* is superadmin-only + audited, the internal tools go through the internal-tool
// fence. A serve/redirect decision — not the v1 error shape — because the caller is a browser
// navigating to a page, not an API client.
//
// The identity lookup is injectable (defaults to Postgres via buildIdentity) so this is
// unit-testable without a database, exactly like the other guards it sits beside.

import type { IncomingMessage, ServerResponse } from "node:http";
import { buildIdentity } from "./request-context.ts";
import type { IdentityLookup } from "./request-context.ts";
import { isInternalIdentity } from "./require-auth.ts";

/** How the shell is actually served once access is granted — the static file handler. */
export type AdminServe = (req: IncomingMessage, res: ServerResponse, url: URL) => void;

export function requireAdminShell(serve: AdminServe, lookup?: IdentityLookup): AdminServe {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
    let internal = false;
    try {
      internal = isInternalIdentity(await buildIdentity(req, lookup));
    } catch {
      // A session-lookup failure (DB hiccup) must fail CLOSED — never hand the shell out on
      // an errored identity. The server fallback doesn't await/catch this, so swallow here.
      internal = false;
    }
    if (internal) return serve(req, res, url);
    // Not internal → send them to the app they actually use. 302 (not 403): a browser
    // typing /admin should land on the real home, not read an error page.
    res.writeHead(302, { Location: "/" });
    res.end();
  };
}
