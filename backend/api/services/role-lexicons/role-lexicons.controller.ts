// Thin controller — parse the request, call the service, format the response.
// No logic, no storage.

import type { RequestContext } from "../../router.ts";
import { createRoleLexiconsService } from "./role-lexicons.service.ts";
import { fileRoleLexiconsRepo } from "./role-lexicons.repo.ts";
import { asRecord, asString } from "../../../shared/guards.ts";

const service = createRoleLexiconsService(fileRoleLexiconsRepo);

export function list(c: RequestContext): void {
  c.json(200, { roles: service.list() });
}

export async function addTerm(c: RequestContext): Promise<void> {
  const { key, term, meaning } = asRecord(await c.readBody());
  c.json(200, service.addTerm(asString(key), term, meaning));
}

export async function removeTerm(c: RequestContext): Promise<void> {
  const { key, term } = asRecord(await c.readBody());
  c.json(200, service.removeTerm(asString(key), term));
}

export async function hideTerm(c: RequestContext): Promise<void> {
  const { key, term } = asRecord(await c.readBody());
  c.json(200, service.hideTerm(asString(key), term));
}

export async function unhideTerm(c: RequestContext): Promise<void> {
  const { key, term } = asRecord(await c.readBody());
  c.json(200, service.unhideTerm(asString(key), term));
}
