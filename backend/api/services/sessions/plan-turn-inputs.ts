// Pure input-builder for the questioning (per-turn planner) stage. The planner
// fires once per submitted answer; the only byte-honest "before send" moment is
// when an answer is pending. This mirrors the live planStream's next-turn
// derivation (session-streams.ts) — pushing the pending turn onto the transcript
// and advancing past the head question — WITHOUT mutating session state, so what's
// previewed is exactly what the next planTurn will send (engine honesty).
// Sibling of preparation-inputs.ts / bank-inputs.ts / evaluation-inputs.ts.

import { getSessionSelectedFocus } from "../../selected-focus.ts";
import type { Session, TranscriptEntry } from "../../../shared/session.types.ts";

// draftAnswer (optional): the answer the manager is typing but hasn't submitted.
// When given, it stands in for a pending answer so the live "Sending" preview can
// show the exact planner prompt as they type — before submit. Falls back to the
// real pendingAnswer when no draft is passed.
function buildPlanTurnInputs(session: Session, draftAnswer?: string) {
  if (!session.focusPointsResult) {
    throw Object.assign(new Error("Focus points not ready"), { status: 409 });
  }
  const pending =
    typeof draftAnswer === "string"
      ? { raw: draftAnswer, text: draftAnswer, skipped: false }
      : session.pendingAnswer;
  if (!pending) {
    throw Object.assign(new Error("No answer submitted yet — nothing queued for the planner"), { status: 409 });
  }
  const q = session.queueRef[0];
  if (!q) {
    throw Object.assign(new Error("No pending question to plan from"), { status: 409 });
  }
  const nextTurn = session.turn + 1;
  // Mirror planStream: the turn entry is pushed BEFORE planning, and the head is
  // shifted off the queue. We build the same shapes without touching the session.
  const turnEntry: TranscriptEntry = { turn: nextTurn, question: q, answer: pending.text, skipped: pending.skipped };
  return {
    focusPoints: session.focusPointsResult.focus_points,
    selectedFocus: getSessionSelectedFocus(session),
    ctx: session.ctx,
    transcript: [...session.transcript, turnEntry],
    lastQuestion: q,
    lastAnswer: pending.text,
    axisState: session.axisState,
    remainingQueue: session.queueRef.slice(1),
    remainingBudget: Math.max(0, session.totalBudget - nextTurn),
    turnNumber: nextTurn,
    totalTurns: session.totalBudget,
    closerAlias: session.closer ? session.closer.alias : null,
    prep: session.preparationResult?.brief || null,
    sessionBank: Array.isArray(session.sessionBank) ? session.sessionBank : [],
  };
}

export { buildPlanTurnInputs };
