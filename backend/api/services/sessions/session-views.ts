// Pure view derivations for the sessions domain: compute a UI/CLI view from a
// Session and touch no storage. Phase 004 step 3, end-of-sessions cleanup: these
// moved out of the session store (backend/api/sessions.ts) to their layered home
// now that every sessions route is in the service/controller — keeping "repos own
// data access" honest (a Session in, a plain view out; no live-state access).
//
// Moved verbatim from sessions.ts. The service (snapshot/inferStage) and the plan
// stream (summarizeAxes) import them from here.

import type { Session, AxisState } from "../../../shared/session.types.ts";

export function snapshot(s: Session) {
  return {
    sessionId: s.id,
    sessionDir: s.dir,
    stage: inferStage(s),
    ctx: s.ctx,
    focusPoints: s.focusPointsResult,
    preparation: s.preparationResult,
    bankReady: s.bankReady,
    turn: s.turn,
    totalBudget: s.totalBudget,
    axes: summarizeAxes(s.axisState),
    briefing: s.briefing,
    notes: s.notes || [],
    agenda: { summary: s.agendaInput?.summary ?? null, covered: s.agendaCovered ?? null },
    mode: s.mode || "manual",
    runLabel: s.runLabel ?? null,
    scripted: s.mode === "scripted"
      ? {
          mode: "scripted",
          personaId: s.fingerprint?.personaId ?? null,
          fallback: s.scriptedFallback || "",
          answers: s.scriptAnswers || {},
        }
      : null,
    createdAt: s.createdAt,
    completedAt: s.completedAt ?? null,
  };
}

export function summarizeAxes(axisState: AxisState) {
  return Object.values(axisState).map((a) => ({
    id: a.id,
    label: a.label,
    score: a.score,
    lastDelta: a.lastDelta,
    historyLen: (a.history && a.history.length) || 0,
  }));
}

export function inferStage(s: Session): string {
  if (s.briefing) return "BRIEFING";
  if (s.turn >= s.totalBudget) return "EVAL";
  if (s.bankReady) return "QUESTIONING";
  if (s.focusPointsResult && s.preparationResult) return "BANK";
  if (s.focusPointsResult) return "PREPARATION";
  return "FOCUS_POINTS";
}
