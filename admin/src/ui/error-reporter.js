// Client error reporter (error-log Phase 3). Installs global crash handlers and forwards a
// compact { message, path } to the backend so browser errors (blank-screen crashes, failed
// loads) land in the same Error log the superadmin reads. Hard-throttled + deduped so a
// crash loop can't flood; a failed report is swallowed so it can never cascade into more
// reports (which would re-trigger window.onerror).

import { reportClientError } from "../../../shared/api.js";

const WINDOW_MS = 60000;
const MAX_PER_WINDOW = 8;
let sent = 0;
const seen = new Set();
setInterval(() => { sent = 0; seen.clear(); }, WINDOW_MS);

// Report one client-side error. `path` defaults to the current screen. Deduped by
// message+path within the window, capped per window, and fire-and-forget.
export function reportError(message, path = location.pathname) {
  const msg = (message == null ? "" : String(message)).slice(0, 2000).trim();
  if (!msg) return;
  const key = `${path}::${msg}`;
  if (seen.has(key) || sent >= MAX_PER_WINDOW) return;
  seen.add(key);
  sent += 1;
  reportClientError({ message: msg, path }).catch(() => {});
}

export function installGlobalErrorReporter() {
  window.addEventListener("error", (e) => {
    reportError((e && (e.message || (e.error && e.error.message))) || "Script error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    reportError((r && (r.message || r)) || "Unhandled promise rejection");
  });
}
