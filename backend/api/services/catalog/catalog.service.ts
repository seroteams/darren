// Catalog logic: sort personas by order + inject meetingTypeIndex. Never touches
// req/res or storage directly — data comes from the injected repo, so the file
// repo can be swapped for a DB one without changing anything here.

import type { CatalogRepo, MeetingType } from "./catalog.repo.ts";

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

// A meeting type as the picker consumes it: the base fields + which engine drives it.
// `kind` is how intake branches — "interview" → startSession (the AI arc), "guided" →
// POST /guided-sessions (the Monthly Check-in stage runner).
export type MeetingKind = "interview" | "guided";
export type CatalogMeetingType = MeetingType & { kind: MeetingKind };

// The guided Monthly Check-in card (monthly-one-on-one Phase 1). APPENDED (never
// inserted) to the interview list for INTERNAL callers only — meetingTypeIndex is a
// positional wire contract, so the interview indices must never shift. It is
// deliberately NOT in backend/engine/meeting-types.ts: persona/smoke/CLI enumerate
// that list and getArc("Monthly Check-in") would throw (plan.md risk #3). Corridor
// managers never see this card while the type is validation-gated.
export const GUIDED_MEETING_TYPE: CatalogMeetingType = {
  label: "Monthly Check-in",
  badge: "New",
  duration: "20 to 40 min",
  description: "A guided monthly catch-up — last month's promises and goals, six ratings, and a shared summary.",
  kind: "guided",
};

export interface CatalogService {
  /** The picker's meeting types. Base 4 are tagged kind:"interview"; internal callers
   *  also get the appended guided card. Non-internal callers never see it. */
  listMeetingTypes(opts?: { internal?: boolean }): readonly CatalogMeetingType[];
  listPersonas(): Record<string, unknown>[];
}

export function createCatalogService(repo: CatalogRepo): CatalogService {
  return {
    listMeetingTypes(opts) {
      const interview: CatalogMeetingType[] = repo
        .getMeetingTypes()
        .map((t) => ({ ...t, kind: "interview" as const }));
      return opts?.internal ? [...interview, GUIDED_MEETING_TYPE] : interview;
    },
    listPersonas() {
      // meetingTypeIndex maps to the BASE interview types only (the positional wire
      // contract sessions.service.ts start() relies on) — the appended guided card is
      // never in this index, so a persona can never point at it.
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
