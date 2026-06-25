import fs from "node:fs";
import path from "node:path";
import { AXES_FILE } from "./paths.mts";
import type { AxisSlot, AxisState } from "../shared/session.types.ts";

const AXES_PATH = AXES_FILE;

const SCORE_CLAMP = 10;
const AXIS_MIN = -SCORE_CLAMP;
const AXIS_MAX = SCORE_CLAMP;

interface AxisDef {
  id: string;
  label: string;
  seed?: number;
}

function loadAxes(): AxisDef[] {
  const data: { axes: AxisDef[] } = JSON.parse(fs.readFileSync(AXES_PATH, "utf8"));
  return data.axes;
}

// The canonical ordered list of axis ids, derived from axes.json so there is a
// single source of truth instead of a hardcoded array repeated per stage.
const AXIS_IDS = loadAxes().map((a) => a.id);

function initState(axes: AxisDef[] = loadAxes()): AxisState {
  const state: AxisState = {};
  for (const a of axes) {
    const seed = typeof a.seed === "number" ? a.seed : 0;
    state[a.id] = { id: a.id, label: a.label, score: seed, lastDelta: 0, history: [] };
  }
  return state;
}

function applyDeltas(
  state: AxisState,
  {
    questionAlias,
    answerExcerpt,
    deltas,
  }: { questionAlias: string; answerExcerpt?: string; deltas?: Record<string, number> },
): void {
  const deltaMap = deltas || {};
  for (const axisId of Object.keys(deltaMap)) {
    const slot = state[axisId];
    if (!slot) continue;
    const delta = Number(deltaMap[axisId]) || 0;
    const proposed = slot.score + delta;
    slot.score = Math.max(-SCORE_CLAMP, Math.min(SCORE_CLAMP, proposed));
    slot.lastDelta = delta;
    slot.history.push({
      q: questionAlias,
      delta,
      answer_excerpt: (answerExcerpt || "").slice(0, 140),
    });
  }
  for (const axisId of Object.keys(state)) {
    const slot = state[axisId];
    if (slot && !(axisId in deltaMap)) slot.lastDelta = 0;
  }
}

function summarize(
  state: AxisState,
): Array<{ id: string; label: string; score: number; lastDelta: number }> {
  return Object.values(state).map((s) => ({
    id: s.id,
    label: s.label,
    score: s.score,
    lastDelta: s.lastDelta,
  }));
}

function serialize(state: AxisState): Record<string, { score: number; history: AxisSlot["history"] }> {
  const out: Record<string, { score: number; history: AxisSlot["history"] }> = {};
  for (const [id, s] of Object.entries(state)) {
    out[id] = { score: s.score, history: s.history };
  }
  return out;
}

function coverageGap(
  state: AxisState,
): Array<{ id: string; touches: number; score: number }> {
  return Object.values(state)
    .map((s) => ({ id: s.id, touches: s.history.length, score: s.score }))
    .sort((a, b) => a.touches - b.touches);
}

function validateAxisState(state: AxisState): void {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("axis state is missing or not an object");
  }
  for (const [id, slot] of Object.entries(state)) {
    if (typeof slot.score !== "number" || !Number.isFinite(slot.score)) {
      throw new Error(`axis state[${id}].score is not a finite number: ${slot.score}`);
    }
    if (slot.score < -SCORE_CLAMP || slot.score > SCORE_CLAMP) {
      throw new Error(`axis state[${id}].score out of range: ${slot.score} (expected ${-SCORE_CLAMP}..${SCORE_CLAMP})`);
    }
    if (!Array.isArray(slot.history)) {
      throw new Error(`axis state[${id}].history is not an array`);
    }
  }
}

export {
  loadAxes,
  initState,
  applyDeltas,
  summarize,
  serialize,
  coverageGap,
  validateAxisState,
  SCORE_CLAMP,
  AXIS_IDS,
  AXIS_MIN,
  AXIS_MAX,
};
