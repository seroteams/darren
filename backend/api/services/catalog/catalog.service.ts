// Catalog logic: sort personas by order + inject meetingTypeIndex. Never touches
// req/res or storage directly — data comes from the injected repo, so the file
// repo can be swapped for a DB one without changing anything here.

import type { CatalogRepo } from "./catalog.repo.ts";

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/** A meeting type as the picker sees it: the engine's interview types tagged
 *  kind:"interview", plus — for admins and managers — the appended guided card
 *  (kind:"guided"). The engine's MEETING_TYPES is never mutated: persona/smoke/CLI
 *  enumerate it positionally, so the guided card lives ONLY in this service response. */
export interface CatalogMeetingType {
  label: string;
  badge: string | null;
  duration: string;
  description: string;
  kind: "interview" | "guided";
}

// The one guided arc in v1 (Monthly Check-in). APPENDED to the catalog (never inserted) so
// interview indices stay stable — meetingTypeIndex is a positional wire contract (risk R6).
const GUIDED_CARD: CatalogMeetingType = {
  label: "Monthly Check-in",
  badge: "New",
  duration: "30 to 45 min",
  description:
    "A guided monthly 1:1 — catch up on last month, talk requests, rate the building blocks, swap feedback, review goals, and agree a summary.",
  kind: "guided",
};

// Hidden from the PICKER only (Carl, 2026-07-19). The engine type + MEETING_TYPES entry stay,
// so historical sessions, replay/smoke fixtures, and the meetingTypeIndex wire contract keep
// resolving. Safe to drop from the response because Onboarding is the LAST engine entry —
// interview indices 0..n-1 stay engine-aligned (risk R6).
export const HIDDEN_FROM_PICKER = "Onboarding check-in";

export interface CatalogService {
  listMeetingTypes(opts?: { guided?: boolean }): CatalogMeetingType[];
  listPersonas(): Record<string, unknown>[];
}

export function createCatalogService(repo: CatalogRepo): CatalogService {
  return {
    listMeetingTypes(opts) {
      const interview: CatalogMeetingType[] = repo
        .getMeetingTypes()
        .filter((t) => t.label !== HIDDEN_FROM_PICKER)
        .map((t) => ({ ...t, kind: "interview" as const }));
      return opts?.guided ? [...interview, GUIDED_CARD] : interview;
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
