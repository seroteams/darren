import type { Session } from "../../../shared/session.types.ts";
import type { Briefing } from "../../../shared/briefing.types.ts";

export interface FinalizeBriefingDeps {
  persist: (session: Session) => void;
  kickReview: (session: Session) => void;
}

// Stamp the completed evaluation result onto the session and PERSIST it. The
// persist matters because the durable store derives `finished = Boolean(briefing)`
// at write time: evaluation is the last stage, so without an explicit persist the
// finished flag never lands and the completed run disappears from both the
// manager's finished-runs list and the member's about-me until a later write
// happens to re-persist (live-test 2026-07-13). Mirrors focusPointsStream, which
// persists in its own setCached for the same reason.
export function finalizeBriefing(
  session: Session,
  result: Briefing,
  deps: FinalizeBriefingDeps,
): void {
  const completedAt = Date.now();
  session.completedAt = completedAt;
  session.briefing = { ...result, cost: session.tracker.summary(), completedAt };
  deps.persist(session);
  deps.kickReview(session);
}
