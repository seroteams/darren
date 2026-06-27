import fs from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "../engine/paths.mts";
import { loadQuestion } from "../engine/questions.ts";

const BENCH_PATH = path.join(CONFIG_DIR, "persona-bench-v1.json");

// Disk JSON is unknown until checked — narrow with these guards (house pattern).
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asAxisEffects(v: unknown): Record<string, number> {
  if (!isObjectRecord(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === "number") out[k] = val;
  return out;
}

/** One step in a persona's fixed script. */
interface ScriptItem {
  alias: string;
  name: string;
  answer: string;
  stage: string | number | null;
  axis_effects: Record<string, number>;
}

/** A scripted-lane persona (only the fields api code reads off the bench). */
export interface Persona {
  id: string;
  script: ScriptItem[];
  script_version: string | null;
  scripted_fallback: string | null;
}

/** A scripted question shaped for the questioning engine. */
export interface ScriptedQuestion {
  alias: string;
  label: string;
  name: string;
  description: string;
  purpose: "scripted";
  stage: string | null;
  axis_effects: Record<string, number>;
  source: "scripted";
}

let cached: Persona[] | null = null;

function toScriptItem(v: unknown): ScriptItem {
  const r = asRecord(v);
  return {
    alias: asString(r.alias),
    name: asString(r.name),
    answer: asString(r.answer),
    stage: typeof r.stage === "string" || typeof r.stage === "number" ? r.stage : null,
    axis_effects: asAxisEffects(r.axis_effects),
  };
}

function toPersona(v: unknown): Persona {
  const r = asRecord(v);
  return {
    id: asString(r.id),
    script: Array.isArray(r.script) ? r.script.map(toScriptItem) : [],
    script_version: typeof r.script_version === "string" ? r.script_version : null,
    scripted_fallback: typeof r.scripted_fallback === "string" ? r.scripted_fallback : null,
  };
}

function loadBench(): Persona[] {
  if (cached) return cached;
  const data: unknown = JSON.parse(fs.readFileSync(BENCH_PATH, "utf8"));
  const personas = isObjectRecord(data) && Array.isArray(data.personas) ? data.personas : [];
  cached = personas.map(toPersona);
  return cached;
}

function loadPersona(personaId: string | null | undefined): Persona | null {
  if (!personaId) return null;
  return loadBench().find((p) => p.id === personaId) || null;
}

// A scripted question still needs a real axis signature, or clampToSignature
// zeroes every per-turn delta and the whole run ships axes "not read" (the
// Jun 06-07 sweeps). Use the script item's own signature when present, else
// resolve the alias against the question pool the script was authored from.
//
// The scripts were authored against pool aliases like `q_ownership_step`, but
// newAlias() prepended another `q_` when those questions were saved, so the
// bank stores most of them doubled as `q_q_ownership_step`. Try the literal
// alias first, then the doubled-prefix variant — without this bridge only
// 18/62 bench aliases resolve a signature and the scripted lane ships blank.
function scriptSignature(item: ScriptItem): Record<string, number> {
  if (item.axis_effects && Object.keys(item.axis_effects).length) return item.axis_effects;
  const candidates = [item.alias];
  if (/^q_/.test(item.alias)) candidates.push("q_" + item.alias);
  for (const alias of candidates) {
    try {
      const ae = asAxisEffects(loadQuestion(alias).axis_effects);
      if (Object.keys(ae).length) return ae;
    } catch {}
  }
  return {};
}

// Shape a persona's fixed script into question objects the questioning engine
// understands. The script — not the live bank/planner — defines the path.
function scriptedQuestions(persona: Persona | null): ScriptedQuestion[] {
  const script = Array.isArray(persona?.script) ? persona.script : [];
  return script.map((item) => ({
    alias: item.alias,
    label: item.alias,
    name: item.name,
    description: "",
    purpose: "scripted" as const,
    // Scripts may carry a numeric stage; normalise to string so scripted items
    // are canonical Questions. Stage ids are strings, so this never changes arc
    // routing (a numeric stage matched no arc stage id before either).
    stage: item.stage == null ? null : String(item.stage),
    axis_effects: scriptSignature(item),
    source: "scripted" as const,
  }));
}

// { alias: answer } lookup the Play-scripted-answer button + coverage use.
function scriptAnswers(persona: Persona | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of persona?.script || []) out[item.alias] = item.answer;
  return out;
}

export { loadPersona, scriptedQuestions, scriptAnswers };
