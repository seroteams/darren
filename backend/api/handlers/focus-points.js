const { requireSession } = require("../sessions");
const { runStage } = require("./stream-helper");
const { generateFocusPoints } = require("../../engine/generate");

module.exports = async function focusPoints(c) {
  const session = requireSession(c.query.s);
  const force = c.query.regenerate === "1" || c.query.regenerate === "true";
  if (force) {
    session.focusPointsResult = null;
    const inFlight = session.inFlight.get("focus-points");
    if (inFlight) {
      inFlight.controller.abort();
      session.inFlight.delete("focus-points");
    }
  }

  await runStage(c, session, "focus-points", {
    thinkingLabel: "Choosing focus points",
    getCached: () => session.focusPointsResult,
    setCached: (r) => { session.focusPointsResult = r; },
    produce: () => generateFocusPoints(session.ctx, { session: { id: session.id, dir: session.dir } }),
    resultEvent: "result",
    buildPayload: (r) => ({ meeting_type: r.meeting_type, focus_points: r.focus_points }),
  });
};
