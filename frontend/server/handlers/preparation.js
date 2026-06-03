const { requireSession } = require("../sessions");
const { runStage } = require("./stream-helper");
const { generatePreparation } = require("../../../src/preparation");
const { getSessionSelectedFocus } = require("../selected-focus");

const IS_DEV = process.env.NODE_ENV !== "production";

module.exports = async function preparation(c) {
  const session = requireSession(c.query.s);

  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("Focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "preparation", {
    thinkingLabel: "Preparing your briefing",
    getCached:  () => session.preparationResult,
    setCached:  (r) => { session.preparationResult = r; },
    produce: () => {
      const selectedFocus = getSessionSelectedFocus(session);
      return generatePreparation(
      {
        ...session.ctx,
        focusPoints: session.focusPointsResult.focus_points,
        selectedFocus,
        primaryFocusId: selectedFocus?.id,
      },
      { session: { id: session.id, dir: session.dir } }
      );
    },
    resultEvent: "result",
    buildPayload: (r) => IS_DEV
      ? { brief: r.brief, runId: r.runId, validation: r.validation }
      : { brief: r.brief, runId: r.runId },
  });
};
