import { requireSession } from "../sessions.ts";
import { runStage } from "./stream-helper.ts";
import { evaluate } from "../../engine/reviewer.ts";
import { getSessionSelectedFocus } from "../selected-focus.ts";
import { serialize } from "../../engine/axes.ts";
import { formatNotesForEvaluation } from "./notes.ts";
import { generateSuggestions, shouldReview } from "../../engine/lexicon-reviewer.ts";
import type { RequestContext } from "../router.ts";
import type { Session } from "../../shared/session.types.ts";

function kickLexiconReview(session: Session): void {
  if (!shouldReview(session.ctx)) return;
  generateSuggestions({ session, ctx: session.ctx }).catch((e: unknown) => {
    console.warn("[evaluation] lexicon review failed:", e instanceof Error ? e.message : String(e));
  });
}

export default async function evaluation(c: RequestContext): Promise<void> {
  const session = requireSession(c.query.s ?? "");
  const intakeNotes = String(session.ctx?.notes || "").trim();
  const capturedNotes = formatNotesForEvaluation(session.notes || []);
  const notesForEvaluation = [intakeNotes, capturedNotes].filter(Boolean).join("\n\n");

  await runStage(c, session, "evaluation", {
    thinkingLabel: "Final evaluation",
    getCached: () => session.briefing,
    setCached: (r) => {
      const completedAt = Date.now();
      session.completedAt = completedAt;
      session.briefing = {
        ...r,
        cost: session.tracker.summary(),
        completedAt,
      };
      kickLexiconReview(session);
    },
    produce: () => {
      // Evaluation is the last stage, so focus points are always present; narrow
      // here for the produce closure (TS can't carry it in) — the original read
      // session.focusPointsResult.focus_points directly and would throw if absent.
      const focusResult = session.focusPointsResult;
      if (!focusResult) {
        throw Object.assign(new Error("focus points not ready"), { status: 409 });
      }
      const selectedFocus = getSessionSelectedFocus(session);
      return evaluate(
        {
          ctx: session.ctx,
          focusPoints: focusResult.focus_points,
          selectedFocus,
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
        },
        { session: { id: session.id, dir: session.dir } }
      );
    },
    resultEvent: "briefing",
    buildPayload: (r) => session.briefing || r,
  });
}
