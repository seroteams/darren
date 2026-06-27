// Thin controller — call the service, format the response. No logic, no storage.

import { runSuite } from "../../../../scripts/lib/replay-suite.ts";
import type { RequestContext } from "../../router.ts";
import { createRegressionService } from "./regression.service.ts";

const service = createRegressionService(runSuite);

export function run(c: RequestContext): void {
  c.json(200, service.run());
}
