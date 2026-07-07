// Pure input-builder for the evaluation (final briefing) stage, mirroring the
// live evaluation stream (session-streams.ts) so what's previewed is exactly what
// gets sent (engine honesty). Shared with the preview read (S1b) — same notes
// pipeline, transcript projection and agenda mapping. No storage, no req/res.
// Sibling of preparation-inputs.ts / bank-inputs.ts.

import { getSessionSelectedFocus } from "../../selected-focus.ts";
import { serialize } from "../../../engine/axes.ts";
import { formatNotesForEvaluation, stripTesterNoteLines } from "./notes-format.ts";
import type { Session } from "../../../shared/session.types.ts";

function buildEvaluationInputs(session: Session) {
  if (!session.focusPointsResult) {
    throw Object.assign(new Error("Focus points not ready"), { status: 409 });
  }
  // Notes pipeline: intake notes + captured mid-run notes, with timestamped
  // tester/observation lines stripped (mirrors evaluationStream lines 179-183).
  const intakeNotes = String(session.ctx?.notes || "").trim();
  const capturedNotes = stripTesterNoteLines(formatNotesForEvaluation(session.notes || []));
  const notesForEvaluation = [intakeNotes, capturedNotes].filter(Boolean).join("\n\n");
  return {
    ctx: session.ctx,
    focusPoints: session.focusPointsResult.focus_points,
    selectedFocus: getSessionSelectedFocus(session),
    // NB: the per-turn planner note (t.note) is deliberately NOT projected here.
    // It carries engine-only vocabulary tags ([SHALLOW], [THREAD-DEFERRED], …)
    // that are decision signals for the runner and the manager's live dashboard,
    // never prose for the reviewer model or any customer-facing surface. Do not
    // add `note: t.note` — it would leak that vocab into the evaluation input.
    // (Locked by evaluation-inputs.test.ts.)
    transcript: session.transcript.map((t) => ({
      question: t.question.name,
      alias: t.question.alias,
      stage: t.question.stage,
      answer: t.answer,
      skipped: t.skipped,
      unbooked_signal: t.unbooked_signal || [],
    })),
    axisState: serialize(session.axisState),
    notes: notesForEvaluation,
    agenda: {
      summary: session.agendaInput?.summary ?? null,
      covered: session.agendaCovered ?? null,
    },
  };
}

export { buildEvaluationInputs };
