const { requireSession, persistSession } = require("../sessions");

// POST /api/agenda/cover — records the closing-check answer ("Did you cover this?").
module.exports = async function agendaCover(c) {
  const body = await c.readBody();
  const { sessionId, covered } = body;
  const session = requireSession(sessionId);
  session.agendaCovered = covered === true;
  persistSession(session);
  c.json(200, { ok: true, covered: session.agendaCovered });
};
