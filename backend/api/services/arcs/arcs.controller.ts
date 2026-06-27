// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. The origin guard on the mutating routes lives in server.ts.

import type { RequestContext } from "../../router.ts";
import { createArcsService } from "./arcs.service.ts";
import { fileArcsRepo } from "./arcs.repo.ts";

const service = createArcsService(fileArcsRepo);

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

export function list(c: RequestContext): void {
  c.json(200, service.list());
}

export async function save(c: RequestContext): Promise<void> {
  const slug = c.params.slug ?? "";
  const body = asRecord(await c.readBody());
  c.json(200, service.save(slug, body));
}

export function reset(c: RequestContext): void {
  const slug = c.params.slug ?? "";
  c.json(200, service.reset(slug));
}
