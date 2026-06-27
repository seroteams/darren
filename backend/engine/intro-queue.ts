import path from "node:path";
import * as questions from "./questions.ts";
import { getArc } from "./meeting-arcs.ts";
import type { Question, QuestionPurpose } from "../shared/question.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asQuestionPurpose(v: unknown): QuestionPurpose {
  return v === "wellbeing" ||
    v === "topic" ||
    v === "competency" ||
    v === "engagement" ||
    v === "scripted" ||
    v === "clarity"
    ? v
    : "topic";
}
function asAxisEffects(v: unknown): Record<string, number> {
  if (!isObjectRecord(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === "number") out[k] = val;
  return out;
}

// Questions on disk (intro queues, _seed overflow) are saved Question YAMLs;
// materialise each loaded record into a canonical Question — every field narrowed
// to its contract type, any extra YAML scalar preserved via the spread. For the
// curated files (which carry the 8 Question fields with valid values) this is
// identical to the raw load. Shared with the planner's _seed overflow path.
function materializeQuestion(rec: Record<string, unknown>): Question {
  return {
    ...rec,
    alias: asString(rec.alias),
    label: asString(rec.label),
    name: asString(rec.name),
    description: asString(rec.description),
    purpose: asQuestionPurpose(rec.purpose),
    stage: typeof rec.stage === "string" ? rec.stage : null,
    axis_effects: asAxisEffects(rec.axis_effects),
    source: asString(rec.source),
  };
}

function sortIntroByArc(introItems: Question[], meetingTypeLabel: string): Question[] {
  const arc = getArc(meetingTypeLabel);
  const stageOrder = new Map(arc.arc.map((stage, index): [string, number] => [stage.id, index]));
  return [...introItems].sort((a, b) => {
    const aStage = typeof a.stage === "string" ? a.stage : "";
    const bStage = typeof b.stage === "string" ? b.stage : "";
    const ai = stageOrder.has(aStage) ? stageOrder.get(aStage) ?? 999 : 999;
    const bi = stageOrder.has(bStage) ? stageOrder.get(bStage) ?? 999 : 999;
    if (ai !== bi) return ai - bi;
    return String(a.alias || "").localeCompare(String(b.alias || ""));
  });
}

function loadIntroQueue(meetingTypeLabel: string, budget: number): Question[] {
  const slug = questions.slugify(meetingTypeLabel);
  const loaded = questions.loadDir(path.join("_intro", slug)).map(materializeQuestion);
  const sorted = sortIntroByArc(loaded, meetingTypeLabel);
  return sorted.slice(0, budget);
}

export { loadIntroQueue, sortIntroByArc, materializeQuestion };
