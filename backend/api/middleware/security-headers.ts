// Security response headers (personal-data-security Phase 2, M-3). Set once on EVERY
// response through the router's handle() chokepoint, so both the API and the static SPA
// carry them — a safety net behind the app's already-disciplined HTML escaping.
//
// CSP: the deployed app is a same-origin Vite SPA with self-hosted fonts (@fontsource,
// bundled into /assets) and NO inline <script> or inline on*= handlers (verified in the
// built HTML + source), so `script-src 'self'` is safe and won't break rendering.
// `style-src` keeps 'unsafe-inline' — the app sets inline style attributes, and style
// injection is far lower-risk than script injection. `frame-ancestors 'none'` (+ the
// legacy X-Frame-Options) stop the console being framed (clickjacking).
//
// HSTS is production-only: over http://localhost it's meaningless and would wrongly pin
// the browser to https for localhost. TLS itself is terminated by Render.

import type { ServerResponse } from "node:http";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

/** Attach the standard security headers to a response. `isProduction` gates HSTS. */
export function setSecurityHeaders(
  res: ServerResponse,
  isProduction: boolean = process.env.NODE_ENV === "production",
): void {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}
