import fs from "node:fs";
import path from "node:path";

import { logStage } from "./session.ts";
import { promptFor } from "./one-on-one-types/index.ts";
import { splitSystemUser, fillPlaceholders } from "./prompt-utils.ts";
import { FOCUS_POINTS_FILE } from "./paths.mts";
import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { loadRoleProfile, renderRoleProfileBlock, roleProfileLogInfo } from "./role-profile.ts";
import { renderFocusHistoryBlock } from "./focus-history.ts";
import type { FocusHistorySession } from "./focus-history.ts";
import type { FocusPoint, FocusPointsResult } from "../shared/session.types.ts";
import { asRecord, asString } from "../shared/guards.ts";

// Model/disk JSON is unknown until checked — narrow with these instead of trusting shapes.

// The model's RESPONSE_SCHEMA pins source/confidence to these enums, so narrow
// the parsed values into the canonical FocusPoint unions (byte-identical to the
// old asString pass-through for any schema-valid response).
function asFocusSource(v: unknown): FocusPoint["source"] {
  return v === "best_practice" ? "best_practice" : "signal";
}
function asConfidence(v: unknown): FocusPoint["confidence"] {
  return v === "high" ? "high" : v === "medium" ? "medium" : "low";
}

// The focus-point catalogue is read from disk; keep each entry by reference so
// every field (description, label_examples, …) still reaches the model prompt.
interface FocusCatalogue {
  focus_points: Array<Record<string, unknown>>;
}

interface FocusPointInputs {
  name?: string;
  role?: string;
  seniority?: string;
  meetingType: string;
  notes?: string;
  // Earlier 1:1s' focus points for this person (focus-freshness Phase 1).
  // Callers without identity (CLI, personas) simply omit it.
  focusHistory?: FocusHistorySession[];
}

type SessionArg = Parameters<typeof logStage>[0];

function readFocusCatalogue(filePath: string): FocusCatalogue {
  const parsed = asRecord(JSON.parse(fs.readFileSync(filePath, "utf8")));
  const points = Array.isArray(parsed.focus_points) ? parsed.focus_points : [];
  return { focus_points: points.map((entry) => asRecord(entry)) };
}

const FOCUS_POINTS_PATH = FOCUS_POINTS_FILE;

const CATALOGUE: FocusCatalogue = readFocusCatalogue(FOCUS_POINTS_PATH);

const getDefaultModel = () => modelFor("focus_points");

// Relational arcs (Bi-weekly check-in, Something feels off) must never surface a
// competency focus point — it reads as a hidden performance review. The model
// can't pick what it isn't given, so we drop competency entries from the menu it
// sees for these arcs. The trust gate (FOCUS_ARC_LEAK) stays as a backstop.
function catalogueForArc(catalogue: FocusCatalogue, meetingType: string): FocusCatalogue {
  if (!isRelationalArc(meetingType)) return catalogue;
  return {
    focus_points: (catalogue.focus_points || []).filter((fp) => fp.category !== "competency"),
  };
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    meeting_type: { type: "string" },
    focus_points: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          reason: { type: "string" },
          source: { type: "string", enum: ["signal", "best_practice"] },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["id", "label", "reason", "source", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["meeting_type", "focus_points"],
  additionalProperties: false,
};

function loadFocusPoints(): FocusCatalogue {
  return CATALOGUE;
}

function oneSentenceReason(text: unknown, maxWords = 22): string {
  const trimmed = String(text || "").trim();
  if (!trimmed) return trimmed;
  const first = trimmed.match(/^(.+?[.!?])(?:\s|$)/)?.[1] || trimmed.split(/\s*;\s*/)[0] || trimmed;
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return first;
  return `${words.slice(0, maxWords).join(" ").replace(/[,;:—–-]+$/, "")}.`;
}

function buildMessages({
  name,
  role,
  seniority,
  meetingType,
  notes,
  focusHistory,
  focusPoints,
}: FocusPointInputs & { focusPoints: unknown }) {
  const template = fs.readFileSync(promptFor(meetingType, "focusPoints"), "utf8");
  const filled = fillPlaceholders(template, {
    FOCUS_POINTS_JSON: JSON.stringify(focusPoints, null, 2),
    NAME: name || "(not provided)",
    ROLE: role || "(not provided)",
    SENIORITY: seniority || "(not provided)",
    MEETING_TYPE: meetingType,
    MANAGER_NOTES: notes || "(none)",
    // Relational arcs get competency history filtered inside the render —
    // a past performance review must not seed evaluative anchors here.
    FOCUS_HISTORY_BLOCK: renderFocusHistoryBlock(focusHistory || [], meetingType),
    ROLE_PROFILE_BLOCK: renderRoleProfileBlock(loadRoleProfile({ role, seniority }), { slice: "focus", meetingType }),
  });

  return splitSystemUser(filled);
}

// Assemble the exact payload generateFocusPoints would send — WITHOUT calling
// the model. `prompt` is byte-for-byte what gets logged as prompt.md. Mirrors the
// catalogue → offered → buildMessages steps of generateFocusPoints so the preview
// can never drift from the real send.
function assembleFocusPoints(
  inputs: FocusPointInputs,
  { model = getDefaultModel() }: { model?: string } = {}
): { model: string; prompt: string } {
  const offered = catalogueForArc(loadFocusPoints(), inputs.meetingType);
  return { model, prompt: buildMessages({ ...inputs, focusPoints: offered }).filled };
}

async function callOpenAI({
  system,
  user,
  model = getDefaultModel(),
}: { system: string; user: string; model?: string }): Promise<string> {
  return callAI({
    system,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: "focus_points_selection",
    temperature: 0.5,
    model,
    costLabel: "01-focus-points",
  });
}

async function generateFocusPoints(
  inputs: FocusPointInputs,
  { model = getDefaultModel(), session, stage = "01-focus-points" }: { model?: string; session?: SessionArg; stage?: string } = {}
): Promise<FocusPointsResult> {
  const catalogue = loadFocusPoints();
  const offered = catalogueForArc(catalogue, inputs.meetingType);
  const messages = buildMessages({ ...inputs, focusPoints: offered });
  const raw = await callOpenAI({ ...messages, model });

  logStage(session, stage, {
    inputs: { ...inputs, model, roleProfile: roleProfileLogInfo(inputs) },
    prompt: messages.filled,
    response: raw,
  });

  const parsed = asRecord(parseAIJson(raw, "Focus points model", ["meeting_type", "focus_points"]));

  const catalogueById = new Map(
    catalogue.focus_points.map((fp): [string, Record<string, unknown>] => [asString(fp.id), fp])
  );
  const items: unknown[] = Array.isArray(parsed.focus_points) ? parsed.focus_points : [];

  return {
    meeting_type: asString(parsed.meeting_type) || inputs.meetingType,
    focus_points: items.map((fp) => {
      const rec = asRecord(fp);
      const id = asString(rec.id);
      const entry = catalogueById.get(id);
      return {
        id,
        type: entry ? asString(entry.label) : null,
        category: entry ? asString(entry.category) : null,
        label: asString(rec.label),
        reason: oneSentenceReason(rec.reason),
        source: asFocusSource(rec.source),
        confidence: asConfidence(rec.confidence),
        known: !!entry,
      };
    }),
  };
}

export { generateFocusPoints, assembleFocusPoints, loadFocusPoints, buildMessages, callOpenAI };
