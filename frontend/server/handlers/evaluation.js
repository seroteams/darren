const { requireSession } = require("../sessions");
const { runStage } = require("./_stream-helper");
const { evaluate } = require("../../../src/reviewer");
const { serialize } = require("../../../src/axes");

module.exports = async function evaluation(c) {
  const session = requireSession(c.query.s);

  await runStage(c, session, "evaluation", {
    thinkingLabel: "Final evaluation",
    getCached: () => session.briefing,
    setCached: (r) => { session.briefing = r; },
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
          notes: session.ctx.notes,
        },
        { session: { id: session.id, dir: session.dir } }
      ),
    resultEvent: "briefing",
    buildPayload: (r) => r,
  });
};
