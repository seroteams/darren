// Thin controller — wire the real boundaries, call the service, format the
// response. No logic, no storage.
//
// canRerun is resolved PER REQUEST (not at module load) so the live site reports
// paid reruns as switched off without a restart, and tests can flip the env.

import { resolveAppEnv } from "../../../db/env-guard.ts";
import type { RequestContext } from "../../router.ts";
import { createRegressionRunsRepo } from "./regression-runs.repo.ts";
import { createRegressionRunsService } from "./regression-runs.service.ts";

const service = createRegressionRunsService(createRegressionRunsRepo(), () => resolveAppEnv() !== "live");

export async function list(c: RequestContext): Promise<void> {
  c.json(200, await service.list());
}
