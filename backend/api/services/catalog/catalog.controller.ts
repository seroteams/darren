// Thin controller — HTTP in/out only. Parses nothing here (these are plain GETs),
// calls the service, formats the response. No logic, no storage.

import type { RequestContext } from "../../router.ts";
import { createCatalogService } from "./catalog.service.ts";
import { fileCatalogRepo } from "./catalog.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { isAdminIdentity } from "../../middleware/require-auth.ts";

const service = createCatalogService(fileCatalogRepo);

// The guided "Monthly Check-in" card is appended for admins and managers (the customer end
// user); members and guests see just the interview types. Resolve identity here so the
// service stays storage/HTTP-agnostic.
export async function getMeetingTypes(c: RequestContext): Promise<void> {
  const identity = await buildIdentity(c.req);
  c.json(200, { types: service.listMeetingTypes({ guided: isAdminIdentity(identity) }) });
}

export function getPersonas(c: RequestContext): void {
  c.json(200, { personas: service.listPersonas() });
}
