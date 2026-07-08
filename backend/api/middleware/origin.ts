import type { IncomingMessage } from "node:http";

// Origin fence for mutating routes. Passes: no Origin header (curl/scripts),
// localhost/127.0.0.1 (dev, any port), or an Origin whose host equals the
// request's own Host header (the served SPA talking to its own server — the
// production case on Render). Any other site's origin is refused.
export function originOk(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    return u.host === req.headers.host;
  } catch {
    return false;
  }
}
