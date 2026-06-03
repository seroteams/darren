const fs = require("node:fs");
const path = require("node:path");

const AXES_PATH = path.join(__dirname, "..", "axes.json");

const SCORE_CLAMP = 10;

function loadAxes() {
  return JSON.parse(fs.readFileSync(AXES_PATH, "utf8")).axes;
}

function initState(axes = loadAxes()) {
  const state = {};
  for (const a of axes) {
    const seed = typeof a.seed === "number" ? a.seed : 0;
    state[a.id] = { id: a.id, label: a.label, score: seed, lastDelta: 0, history: [] };
  }
  return state;
}

function applyDeltas(state, { questionAlias, answerExcerpt, deltas }) {
  for (const axisId of Object.keys(deltas || {})) {
    const slot = state[axisId];
    if (!slot) continue;
    const delta = Number(deltas[axisId]) || 0;
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
    if (!(axisId in (deltas || {}))) state[axisId].lastDelta = 0;
  }
}

function summarize(state) {
  return Object.values(state).map((s) => ({
    id: s.id,
    label: s.label,
    score: s.score,
    lastDelta: s.lastDelta,
  }));
}

function serialize(state) {
  const out = {};
  for (const [id, s] of Object.entries(state)) {
    out[id] = { score: s.score, history: s.history };
  }
  return out;
}

function coverageGap(state) {
  return Object.values(state)
    .map((s) => ({ id: s.id, touches: s.history.length, score: s.score }))
    .sort((a, b) => a.touches - b.touches);
}

function validateAxisState(state) {
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

module.exports = { loadAxes, initState, applyDeltas, summarize, serialize, coverageGap, validateAxisState, SCORE_CLAMP };
