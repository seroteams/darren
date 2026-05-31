const { requireSession } = require("../sessions");

module.exports = function question(c) {
  const session = requireSession(c.query.s);
  if (session.turn >= session.totalBudget || session.queueRef.length === 0) {
    return c.json(200, { done: true });
  }
  const q = session.queueRef[0];
  const returningToArc = Boolean(session.showReturningToArcHint);
  if (returningToArc) session.showReturningToArcHint = false;
  c.json(200, {
    turn: session.turn + 1,
    total: session.totalBudget,
    queueLen: session.queueRef.length,
    returningToArc,
    question: {
      alias: q.alias,
      label: q.label,
      name: q.name,
      description: q.description,
      purpose: q.purpose,
    },
  });
};
