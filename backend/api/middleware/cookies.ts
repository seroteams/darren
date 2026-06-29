// Cookie read/write for the login session (Phase 006 Phase 3). One place that knows
// the cookie's name and attributes.
//
// httpOnly: JavaScript can't read it (XSS can't steal the session). SameSite=Lax:
// not sent on cross-site requests. Secure (HTTPS-only) is set ONLY in production —
// a Secure cookie is dropped over plain http, which would break local dev on
// http://localhost. So local dev gets httpOnly+Lax; production additionally gets
// Secure.

import type { IncomingMessage } from "node:http";

export const SESSION_COOKIE = "sero_session";

/** The value of a named cookie on the request, or null. */
export function readCookie(req: IncomingMessage, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function attributes(maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

/** Set-Cookie value that stores the session token. */
export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${attributes(maxAgeSeconds)}`;
}

/** Set-Cookie value that clears the session cookie (Max-Age=0). */
export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${attributes(0)}`;
}
