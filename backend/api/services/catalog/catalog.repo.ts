// Data access for catalog (reference) data — meeting types + the persona bench.
// File-backed now; a DB-backed impl can replace `fileCatalogRepo` without
// touching CatalogService (the Phase 004 storage seam).

import fs from "node:fs";
import path from "node:path";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { CONFIG_DIR } from "../../../engine/paths.mts";

export type MeetingType = (typeof MEETING_TYPES)[number];

export interface CatalogRepo {
  getMeetingTypes(): readonly MeetingType[];
  getPersonas(): Record<string, unknown>[];
}

const BENCH_PATH = path.join(CONFIG_DIR, "persona-bench-v1.json");

// Disk JSON is unknown until checked — narrow with these guards (house pattern).
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

let cachedPersonas: Record<string, unknown>[] | null = null;

/** The current file storage. Reproduces the prior handler's load + cache +
 *  validation exactly. */
export const fileCatalogRepo: CatalogRepo = {
  getMeetingTypes() {
    return MEETING_TYPES;
  },
  getPersonas() {
    if (cachedPersonas) return cachedPersonas;
    const data: unknown = JSON.parse(fs.readFileSync(BENCH_PATH, "utf8"));
    if (!isObjectRecord(data) || !Array.isArray(data.personas)) {
      throw new Error("persona-bench-v1.json: personas array required");
    }
    cachedPersonas = data.personas.map(asRecord);
    return cachedPersonas;
  },
};
