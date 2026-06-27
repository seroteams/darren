// Thin controller — parse the query, call the service, format the response.

import type { RequestContext } from "../../router.ts";
import { createPipelineService } from "./pipeline.service.ts";
import { filePipelineRepo } from "./pipeline.repo.ts";

const service = createPipelineService(filePipelineRepo);

export function status(c: RequestContext): void {
  c.json(200, service.status(c.query.baseline || "latest"));
}

export function manifest(c: RequestContext): void {
  c.json(200, service.manifest());
}
