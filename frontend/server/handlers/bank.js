const { requireSession } = require("../sessions");
const { runStage } = require("./_stream-helper");
const { generateBankWithFallback } = require("../../../src/question-generator");
const { getArc } = require("../../../src/meeting-arcs");

module.exports = async function bank(c) {
  const session = requireSession(c.query.s);
  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "bank", {
    thinkingLabel: "Generating question bank",
    getCached: () => (session.bankReady ? { count: session.bankReady.count } : null),
    setCached: (payload) => {
      session.bankReady = payload;
    },
    produce: async () => {
      const bankItems = await generateBankWithFallback(
        {
          focusPoints: session.focusPointsResult.focus_points,
          ...session.ctx,
          existingQueue: session.introQueue,
        },
        { session: { id: session.id, dir: session.dir } },
        { onFallback: (e) => console.warn("[bank] generation failed, falling back to _seed:", e.message) }
      );
      session.queueRef = [...session.introQueue, ...bankItems];

      // Reserve the closer: last bank item tagged with the arc's final stage.
      // plan.js force-inserts this at queueRef[0] when turn + 1 === totalBudget,
      // so the planner can't accidentally drop or rewrite it.
      const arc = getArc(session.ctx.meetingType);
      const finalStageId = arc.arc[arc.arc.length - 1].id;
      const closerCandidates = bankItems.filter((q) => q.stage === finalStageId);
      session.closer = closerCandidates.length ? closerCandidates[closerCandidates.length - 1] : null;

      return { count: bankItems.length };
    },
    resultEvent: "ready",
    buildPayload: (r) => ({ count: r.count }),
  });
};
