// Thin controller — HTTP in/out only. Parses nothing here (these are plain GETs),
// calls the service, formats the response. No logic, no storage.

import type { RequestContext } from "../../router.ts";
import { createCatalogService } from "./catalog.service.ts";
import { fileCatalogRepo } from "./catalog.repo.ts";

const service = createCatalogService(fileCatalogRepo);

export function getMeetingTypes(c: RequestContext): void {
  c.json(200, { types: service.listMeetingTypes() });
}

export function getPersonas(c: RequestContext): void {
  c.json(200, { personas: service.listPersonas() });
}
