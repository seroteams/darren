// Catalog logic: sort personas by order + inject meetingTypeIndex. Never touches
// req/res or storage directly — data comes from the injected repo, so the file
// repo can be swapped for a DB one without changing anything here.

import type { CatalogRepo, MeetingType } from "./catalog.repo.ts";

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

export interface CatalogService {
  listMeetingTypes(): readonly MeetingType[];
  listPersonas(): Record<string, unknown>[];
}

export function createCatalogService(repo: CatalogRepo): CatalogService {
  return {
    listMeetingTypes() {
      return repo.getMeetingTypes();
    },
    listPersonas() {
      const types = repo.getMeetingTypes();
      return repo
        .getPersonas()
        .slice()
        .sort((a, b) => asNumber(a.order) - asNumber(b.order))
        .map((p) => {
          const meetingTypeIndex = types.findIndex((t) => t.label === p.meeting_type);
          return { ...p, meetingTypeIndex };
        });
    },
  };
}
