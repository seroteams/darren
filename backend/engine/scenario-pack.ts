// Scenario pack for the dev "Suggest notes" helper: a tiny fictional world
// (2 projects, 2 coworkers, 1 incident, 1 thing going well) generated once per
// session and cached in the session dir, so every suggestion draws on the SAME
// concrete specifics instead of paraphrasing the situation notes. Dev aid only —
// generated lazily on the first suggest click, never during a normal run.

import fs from "node:fs";
import path from "node:path";
import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";
import type { MeetingContext } from "../shared/session.types.ts";
import { asRecord } from "../shared/guards.ts";

export interface ScenarioPack {
  projects: string[]; // exactly 2
  coworkers: string[]; // exactly 2, "Name (role)" style
  incident: string; // one recent concrete thing that went sideways
  goingWell: string; // one concrete thing going well
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    projects: { type: "array", items: { type: "string" } },
    coworkers: { type: "array", items: { type: "string" } },
    incident: { type: "string" },
    goingWell: { type: "string" },
  },
  required: ["projects", "coworkers", "incident", "goingWell"],
  additionalProperties: false,
};

const SYSTEM = `You invent a tiny consistent backdrop for a roleplay test of a 1:1 tool. Given a report's role and the manager's private situation notes, make up the small world the report lives in.

Rules:
- 2 named projects (short, plausible for the role — a real-sounding initiative, not "Project A").
- 2 named coworkers as "Name (role)" — people the report works with day to day.
- 1 recent concrete incident that went sideways, consistent with the situation notes (one sentence, specific: what slipped, where).
- 1 concrete thing going well (one sentence).
- Everything must fit the role and the notes; invent specifics, never contradict them.
Return strict JSON only: {"projects":["..",".."],"coworkers":["..",".."],"incident":"..","goingWell":".."}. No prose.`;

function cleanTwo(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  return items.length === 2 ? items : null;
}

function cleanLine(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return s ? s : null;
}

export function parseScenarioPack(raw: unknown): ScenarioPack | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const projects = cleanTwo(r.projects);
  const coworkers = cleanTwo(r.coworkers);
  const incident = cleanLine(r.incident);
  const goingWell = cleanLine(r.goingWell);
  if (!projects || !coworkers || !incident || !goingWell) return null;
  return { projects, coworkers, incident, goingWell };
}

export function formatScenarioPack(pack: ScenarioPack): string {
  return [
    `The report's world (fixed for this whole run — reuse these names, never invent rivals):`,
    `- Projects: ${pack.projects.join("; ")}`,
    `- Works with: ${pack.coworkers.join("; ")}`,
    `- Recent incident: ${pack.incident}`,
    `- Going well: ${pack.goingWell}`,
  ].join("\n");
}

function packPath(dir: string): string {
  return path.join(dir, "scenario-pack.json");
}

// One model call per session, cached on disk beside the run. Failures degrade to
// null — the suggester still works, just without the shared world.
export async function ensureScenarioPack(
  ctx: MeetingContext,
  dir: string,
  { model = modelFor("bank") }: { model?: string } = {}
): Promise<ScenarioPack | null> {
  try {
    const cached = parseScenarioPack(JSON.parse(fs.readFileSync(packPath(dir), "utf8")));
    if (cached) return cached;
  } catch {
    // no cache yet (or unreadable) — generate below
  }
  try {
    const user = [
      `The report: ${ctx.name || "the employee"}, ${ctx.seniority || ""} ${ctx.role || ""}`.trim(),
      `Meeting type: ${ctx.meetingType || "1:1"}`,
      `Manager's private situation notes: ${ctx.notes && ctx.notes.trim() ? ctx.notes.trim() : "(none)"}`,
      ``,
      `Invent the backdrop. Return the JSON now.`,
    ].join("\n");
    const raw = await callAI({
      system: SYSTEM,
      user,
      schema: RESPONSE_SCHEMA,
      schemaName: "scenario_pack",
      temperature: 0.8,
      model,
      costLabel: "aux-scenario-pack",
    });
    const pack = parseScenarioPack(asRecord(parseAIJson(raw, "Scenario pack", ["projects"])));
    if (pack) fs.writeFileSync(packPath(dir), JSON.stringify(pack, null, 2));
    return pack;
  } catch (e) {
    console.warn("[scenario-pack] failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
