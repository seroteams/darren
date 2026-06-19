const fs = require("node:fs");
const path = require("node:path");
const { requireSession, summarizeAxes, persistSession } = require("../sessions");

// Append the discarded turn to amend-log.json so the run record keeps the
// original answer alongside whatever the amended one turns out to be.
function logAmendment(session, snap) {
  const file = path.join(session.dir, "amend-log.json");
  let log = [];
  try {
    if (fs.existsSync(file)) log = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.warn("[back] amend-log read failed:", e.message);
  }
  log.push({
    discarded_turn: snap.appliedTurn,
    question_alias: snap.question?.alias ?? null,
    original_answer: snap.answerText ?? "",
  });
  try {
    fs.writeFileSync(file, JSON.stringify(log, null, 2));
  } catch (e) {
    console.warn("[back] amend-log write failed:", e.message);
  }
}

// One-step-back: revert the most recently planned turn and re-present its
// question for an amend. Full discard & re-run — score deltas, the re-planned
// queue, and any agenda carry-forward are all rolled back to the snapshot taken
// before that turn was planned.
module.exports = async function back(c) {
  const body = await c.readBody();
  const session = requireSession(body.sessionId);

  const snap = (session.turnSnapshots || []).pop();
  if (!snap) {
    return c.error(Object.assign(new Error("nothing to go back to"), { status: 409 }));
  }

  logAmendment(session, snap);

  session.turn = snap.turn;
  session.totalBudget = snap.totalBudget;
  session.queueRef = snap.queueRef;
  session.axisState = snap.axisState;
  session.transcript = snap.transcript;
  session.agendaInjected = snap.agendaInjected;
  session.agendaInput = snap.agendaInput;
  session.pendingAnswer = null;
  // Drop the cached plan for the turn we just undid so the re-answer re-plans.
  session.lastPlanByTurn.delete(snap.appliedTurn);

  persistSession(session);

  c.json(200, {
    turn: session.turn + 1,
    total: session.totalBudget,
    answer: snap.answerText ?? "",
    axes: summarizeAxes(session.axisState),
  });
};
