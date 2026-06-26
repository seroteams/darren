const { requireSession } = require("../sessions.ts");
const { runStage } = require("./stream-helper.ts");
const { evaluate } = require("../../engine/reviewer.ts");
const { getSessionSelectedFocus } = require("../selected-focus.ts");
const { serialize } = require("../../engine/axes.ts");
const { formatNotesForEvaluation } = require("./notes");
const { generateSuggestions, shouldReview } = require("../../engine/lexicon-reviewer.ts");

function kickLexiconReview(session) {
  if (!shouldReview(session.ctx)) return;
  generateSuggestions({ session, ctx: session.ctx }).catch((e) => {
    console.warn("[evaluation] lexicon review failed:", e.message);
  });
}

module.exports = async function evaluation(c) {
  const session = requireSession(c.query.s);
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
      const selectedFocus = getSessionSelectedFocus(session);
      return evaluate(
        {
          ctx: session.ctx,
          focusPoints: session.focusPointsResult.focus_points,
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
};
