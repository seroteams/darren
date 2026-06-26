import fs from "node:fs";
import path from "node:path";
import { MEETING_TYPES } from "../../engine/meeting-types.ts";
import { CONFIG_DIR } from "../../engine/paths.mts";
import type { RequestContext } from "../router.ts";

const BENCH_PATH = path.join(CONFIG_DIR, "persona-bench-v1.json");

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

let cached: Record<string, unknown>[] | null = null;

function loadBench(): Record<string, unknown>[] {
  if (cached) return cached;
  const raw = fs.readFileSync(BENCH_PATH, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!isObjectRecord(data) || !Array.isArray(data.personas)) {
    throw new Error("persona-bench-v1.json: personas array required");
  }
  cached = data.personas.map(asRecord);
  return cached;
}

export default function personaBench(c: RequestContext): void {
  const personas = loadBench()
    .slice()
    .sort((a, b) => asNumber(a.order) - asNumber(b.order))
    .map((p) => {
      const meetingTypeIndex = MEETING_TYPES.findIndex((t) => t.label === p.meeting_type);
      return { ...p, meetingTypeIndex };
    });

  c.json(200, { personas });
}
