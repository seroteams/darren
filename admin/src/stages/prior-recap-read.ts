// The walk-in glance's read (last-one-to-one P3), shared by the two stages that
// draw the walk-in card: bank.js shows it first, questioning.js shows it when the
// bank was already built.
//
// One job beyond calling the endpoint: this read sits on the path that paints the
// walk-in card, and a hung request there would leave the manager on an empty
// screen with a meeting to run. It cannot block. A failure, a refusal or a slow
// server all resolve to null, and the panel is then exactly what it is today.

import { getPriorRecap } from "../../../shared/api.js";

/** How long the glance gets before the card goes up without it. */
export const RECAP_TIMEOUT_MS = 2500;

/**
 * Never rejects, never hangs. Null means "no glance", which is a first-class
 * state on this screen rather than an error the manager should ever meet.
 */
export function loadPriorRecap(sessionId: string, timeoutMs = RECAP_TIMEOUT_MS): Promise<unknown | null> {
  const id = String(sessionId || "");
  if (!id) return Promise.resolve(null);
  const read = getPriorRecap(id)
    .then((r) => (r as { prior?: unknown } | null)?.prior ?? null)
    .catch((e: unknown) => {
      console.warn("[prior-recap] read failed (walking in without the glance):", (e as Error)?.message);
      return null;
    });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([read, timeout]);
}
