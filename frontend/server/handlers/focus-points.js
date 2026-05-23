const { requireSession } = require("../sessions");
const { runStage } = require("./_stream-helper");
const { generateFocusPoints } = require("../../../src/generate");

module.exports = async function focusPoints(c) {
  const session = requireSession(c.query.s);

  await runStage(c, session, "focus-points", {
    thinkingLabel: "Choosing focus points",
    getCached: () => session.focusPointsResult,
    setCached: (r) => { session.focusPointsResult = r; },
    produce: () => generateFocusPoints(session.ctx, { session: { id: session.id, dir: session.dir } }),
    resultEvent: "result",
    buildPayload: (r) => ({ meeting_type: r.meeting_type, focus_points: r.focus_points }),
  });
};
