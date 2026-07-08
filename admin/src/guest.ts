// The guest lane entry (guest-run Phase 2): straight into intake, no account.
// A fresh run every time — any stale remembered session id is dropped so boot
// can't pull a visitor into an old run. Shared by the start screen (welcome.ts)
// and the login screen's "Try it" link, so the entry logic lives once.

import { STAGES } from "./state.js";
import type { Store } from "./state.js";
import { claimSession } from "../../shared/api.js";

export function startGuestRun(setState: (patch: Partial<Store>) => void): void {
  try { localStorage.removeItem("seroSessionId"); } catch { /* storage blocked — fine */ }
  setState({ user: null, sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
}

// Save-at-end (guest-run Phase 3). The briefing's save card marks the finished run
// before sending the guest to register/login; the auth success paths then call
// completeClaimAfterAuth to make the run theirs and land straight on it.

export function markRunForClaim(sessionId: string): void {
  try { localStorage.setItem("seroClaimSessionId", sessionId); } catch { /* storage blocked — fine */ }
}

// Returns true when it claimed and navigated; false means "nothing to do or claim
// failed" — the caller lands per role as always, so a broken save never strands a login.
// The marker is cleared up front either way: a claim is attempted at most once.
export async function completeClaimAfterAuth(
  user: unknown,
  setState: (patch: Partial<Store>) => void,
  claim: (id: string) => Promise<unknown> = claimSession,
): Promise<boolean> {
  let id: string | null = null;
  try { id = localStorage.getItem("seroClaimSessionId"); } catch { /* storage blocked — fine */ }
  if (!id) return false;
  try { localStorage.removeItem("seroClaimSessionId"); } catch { /* storage blocked — fine */ }
  try {
    await claim(id);
  } catch {
    return false;
  }
  // Claimed: drop the remembered session so boot never resumes the finished run.
  try { localStorage.removeItem("seroSessionId"); } catch { /* storage blocked — fine */ }
  setState({ user, stage: STAGES.RUN_DETAIL, myRunId: id } as Partial<Store>);
  return true;
}
