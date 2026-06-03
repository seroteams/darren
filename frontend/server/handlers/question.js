const { requireSession } = require("../sessions");

module.exports = function question(c) {
  const session = requireSession(c.query.s);
  if (session.turn >= session.totalBudget || session.queueRef.length === 0) {
    return c.json(200, {
      done: true,
      agenda: {
        summary: session.agendaInput?.summary ?? null,
        covered: session.agendaCovered ?? null,
      },
    });
  }
  const q = session.queueRef[0];
  const returningToArc = Boolean(session.showReturningToArcHint);
  if (returningToArc) session.showReturningToArcHint = false;
  const scripted = session.mode === "scripted"
    ? {
        alias: q.alias,
        answer: session.scriptAnswers?.[q.alias] ?? null,
        fallback: session.scriptedFallback || "",
      }
    : null;
  c.json(200, {
    turn: session.turn + 1,
    total: session.totalBudget,
    queueLen: session.queueRef.length,
    returningToArc,
    scripted,
    question: {
      alias: q.alias,
      label: q.label,
      name: q.name,
      description: q.description,
      purpose: q.purpose,
    },
  });
};
