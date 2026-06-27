// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. Origin guards on the mutating routes live in server.ts.
// Covers run history + Run Review; suggest-fix (the AI route) stays in its handler.

import type { RequestContext } from "../../router.ts";
import { createRunsService } from "./runs.service.ts";
import { fileRunsRepo } from "./runs.repo.ts";

const service = createRunsService(fileRunsRepo);

export function recent(c: RequestContext): void {
  c.json(200, service.recent(c.query.limit));
}

export function finished(c: RequestContext): void {
  c.json(200, service.finished());
}

export function overview(c: RequestContext): void {
  c.json(200, service.overview(c.params.id));
}

export function full(c: RequestContext): void {
  c.json(200, service.full(c.params.id));
}

export function stages(c: RequestContext): void {
  c.json(200, service.stages(c.params.id));
}

export function del(c: RequestContext): void {
  c.json(200, service.remove(c.params.id));
}

export async function archive(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  c.json(200, service.archive(c.params.id, body));
}

export async function review(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  c.json(200, service.review(c.params.id, body));
}
