// Job lexicons API. Read = list every role's words (the role-profile cache).
// Write = add/remove the *user's* words, which live in a sidecar overlay file,
// never in the generated profile. No model calls anywhere here.

const {
  listRoleProfiles,
  addOverlayTerm,
  removeOverlayTerm,
} = require("../../../src/role-profile");

function list(c) {
  return c.json(200, { roles: listRoleProfiles() });
}

async function addTerm(c) {
  const { key, term, meaning } = (await c.readBody()) || {};
  const entry = addOverlayTerm(key, { term, meaning }); // throws { status } on bad input
  return c.json(200, { ok: true, term: entry });
}

async function removeTerm(c) {
  const { key, term } = (await c.readBody()) || {};
  const remaining = removeOverlayTerm(key, term);
  return c.json(200, { ok: true, remaining });
}

module.exports = { list, addTerm, removeTerm };
