// Read-only: list every cached role profile's words for the Job lexicons page.
// No model call, no session — just reads the role-profile cache from disk, the
// same words the live 1:1 already uses.

const { listRoleProfiles } = require("../../../src/role-profile");

module.exports = function roleLexicons(c) {
  return c.json(200, { roles: listRoleProfiles() });
};
