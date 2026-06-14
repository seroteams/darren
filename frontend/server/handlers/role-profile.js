// Read-only: expose the cached role profile's terminology for a session, so the
// one-page run can show "the language of this role" before the interview.
// No model call — the profile was generated at /api/start (pre-warm) and is just
// read from disk here.

const { getSession } = require("../sessions");
const { loadRoleProfile, effectiveTerminology, terminologyGroups } = require("../../../src/role-profile");

module.exports = function roleProfile(c) {
  const sessionId = c.query.s;
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  const doc = loadRoleProfile(session.ctx || {});
  return c.json(200, {
    ready: Boolean(doc),
    terminology: doc ? effectiveTerminology(doc) : [],
    terminologyGroups: doc ? terminologyGroups(doc.profile) : [],
  });
};
