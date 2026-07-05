// The guest lane entry (guest-run Phase 2): straight into intake, no account.
// A fresh run every time — any stale remembered session id is dropped so boot
// can't pull a visitor into an old run. Shared by the start screen (welcome.ts)
// and the login screen's "Try it" link, so the entry logic lives once.

import { STAGES } from "./state.js";
import type { Store } from "./state.js";

export function startGuestRun(setState: (patch: Partial<Store>) => void): void {
  try { localStorage.removeItem("seroSessionId"); } catch { /* storage blocked — fine */ }
  setState({ user: null, sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
}
