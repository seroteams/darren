const { requireSession, persistSession } = require("../sessions");

module.exports = async function selectedFocus(c) {
  const body = await c.readBody();
  const session = requireSession(body.sessionId);
  const ids = Array.isArray(body.focusPointIds)
    ? body.focusPointIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  session.selectedFocusPoints = ids;
  persistSession(session);
  c.json(200, { selectedFocusPoints: ids });
};
