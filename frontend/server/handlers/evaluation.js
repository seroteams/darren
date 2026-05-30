const { requireSession } = require("../sessions");
const { runStage } = require("./stream-helper");
const { evaluate } = require("../../../src/reviewer");
const { serialize } = require("../../../src/axes");
const { formatNotesForEvaluation } = require("./notes");

module.exports = async function evaluation(c) {
  const session = requireSession(c.query.s);
  const intakeNotes = String(session.ctx?.notes || "").trim();
  const capturedNotes = formatNotesForEvaluation(session.notes || []);
  const notesForEvaluation = [intakeNotes, capturedNotes].filter(Boolean).join("\n\n");

  await runStage(c, session, "evaluation", {
    thinkingLabel: "Final evaluation",
    getCached: () => session.briefing,
    setCached: (r) => {
      session.briefing = { ...r, cost: session.tracker.summary() };
    },
    produce: () =>
      evaluate(
        {
          ctx: session.ctx,
          focusPoints: session.focusPointsResult.focus_points,
          transcript: session.transcript.map((t) => ({
            question: t.question.name,
            alias: t.question.alias,
            answer: t.answer,
            skipped: t.skipped,
          })),
          axisState: serialize(session.axisState),
          notes: notesForEvaluation,
        },
        { session: { id: session.id, dir: session.dir } }
      ),
    resultEvent: "briefing",
    buildPayload: (r) => session.briefing || r,
  });
};
