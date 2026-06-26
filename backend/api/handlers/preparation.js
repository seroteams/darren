const { requireSession } = require("../sessions.ts");
const { runStage } = require("./stream-helper.ts");
const { generatePreparation } = require("../../engine/preparation.ts");
const { getSessionSelectedFocus } = require("../selected-focus.ts");

const IS_DEV = process.env.NODE_ENV !== "production";

// Map live session state to the inputs generatePreparation expects. Shared with
// the preview endpoint so what's previewed is exactly what gets sent.
function buildPreparationInputs(session) {
  const selectedFocus = getSessionSelectedFocus(session);
  return {
    ...session.ctx,
    focusPoints: session.focusPointsResult.focus_points,
    selectedFocus,
    primaryFocusId: selectedFocus?.id,
  };
}

async function preparation(c) {
  const session = requireSession(c.query.s);

  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("Focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "preparation", {
    thinkingLabel: "Preparing your briefing",
    getCached:  () => session.preparationResult,
    setCached:  (r) => { session.preparationResult = r; },
    produce: () => generatePreparation(
      buildPreparationInputs(session),
      { session: { id: session.id, dir: session.dir } }
    ),
    resultEvent: "result",
    buildPayload: (r) => IS_DEV
      ? { brief: r.brief, runId: r.runId, validation: r.validation }
      : { brief: r.brief, runId: r.runId },
  });
}

module.exports = preparation;
module.exports.buildPreparationInputs = buildPreparationInputs;
