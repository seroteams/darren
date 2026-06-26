const { getSession, snapshot } = require("../sessions.ts");

module.exports = function rehydrate(c) {
  const id = c.query.s;
  if (!id) return c.error(Object.assign(new Error("s required"), { status: 400 }));
  const session = getSession(id);
  if (!session) return c.error(Object.assign(new Error("unknown session"), { status: 404 }));
  c.json(200, snapshot(session));
};
