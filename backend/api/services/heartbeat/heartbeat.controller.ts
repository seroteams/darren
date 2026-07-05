// Thin controller — call the service, return the snapshot. No logic, no storage.

import type { RequestContext } from "../../router.ts";
import { createHeartbeatService } from "./heartbeat.service.ts";
import { fileHeartbeatRepo } from "./heartbeat.repo.ts";
import { getBuildInfo } from "../../build-info.ts";

const service = createHeartbeatService(fileHeartbeatRepo, getBuildInfo);

export function snapshot(c: RequestContext): void {
  c.json(200, service.snapshot());
}
