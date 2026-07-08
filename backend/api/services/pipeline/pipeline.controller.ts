// Thin controller — parse the query, call the service, format the response.

import type { RequestContext } from "../../router.ts";
import { createPipelineService } from "./pipeline.service.ts";
import { pipelineRepo } from "./pipeline.repo.ts";

const service = createPipelineService(pipelineRepo);

export async function status(c: RequestContext): Promise<void> {
  c.json(200, await service.status(c.query.baseline || "latest"));
}
