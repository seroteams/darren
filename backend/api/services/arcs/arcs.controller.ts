// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. The origin guard on the mutating routes lives in server.ts.

import type { RequestContext } from "../../router.ts";
import { createArcsService } from "./arcs.service.ts";
import { fileArcsRepo } from "./arcs.repo.ts";
import { asRecord } from "../../../shared/guards.ts";

const service = createArcsService(fileArcsRepo);

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
