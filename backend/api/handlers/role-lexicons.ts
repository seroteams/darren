// Job lexicons API. Read = list every role's words (the role-profile cache).
// Write = add/remove the *user's* words, which live in a sidecar overlay file,
// never in the generated profile. No model calls anywhere here.

import {
  listRoleProfiles,
  addOverlayTerm,
  removeOverlayTerm,
} from "../../engine/role-profile.ts";
import type { RequestContext } from "../router.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function list(c: RequestContext): void {
  c.json(200, { roles: listRoleProfiles() });
}

async function addTerm(c: RequestContext): Promise<void> {
  const { key, term, meaning } = asRecord(await c.readBody());
  const entry = addOverlayTerm(asString(key), { term, meaning }); // throws { status } on bad input
  c.json(200, { ok: true, term: entry });
}

async function removeTerm(c: RequestContext): Promise<void> {
  const { key, term } = asRecord(await c.readBody());
  const remaining = removeOverlayTerm(asString(key), term);
  c.json(200, { ok: true, remaining });
}

export { list, addTerm, removeTerm };
