const fs = require("node:fs");
const path = require("node:path");

const BENCH_PATH = path.join(__dirname, "..", "..", "config", "persona-bench-v1.json");

let cached = null;

function loadBench() {
  if (cached) return cached;
  const data = JSON.parse(fs.readFileSync(BENCH_PATH, "utf8"));
  cached = Array.isArray(data.personas) ? data.personas : [];
  return cached;
}

function loadPersona(personaId) {
  if (!personaId) return null;
  return loadBench().find((p) => p.id === personaId) || null;
}

// A scripted question still needs a real axis signature, or clampToSignature
// zeroes every per-turn delta and the whole run ships axes "not read" (the
// Jun 06-07 sweeps). Use the script item's own signature when present, else
// resolve the alias against the question pool the script was authored from.
function scriptSignature(item) {
  if (item.axis_effects && Object.keys(item.axis_effects).length) return item.axis_effects;
  try {
    const q = require("../../src/questions").loadQuestion(item.alias);
    if (q?.axis_effects && Object.keys(q.axis_effects).length) return q.axis_effects;
  } catch {}
  return {};
}

// Shape a persona's fixed script into question objects the questioning engine
// understands. The script — not the live bank/planner — defines the path.
function scriptedQuestions(persona) {
  const script = Array.isArray(persona?.script) ? persona.script : [];
  return script.map((item) => ({
    alias: item.alias,
    label: item.alias,
    name: item.name,
    description: "",
    purpose: "scripted",
    stage: item.stage ?? null,
    axis_effects: scriptSignature(item),
    source: "scripted",
  }));
}

// { alias: answer } lookup the Play-scripted-answer button + coverage use.
function scriptAnswers(persona) {
  const out = {};
  for (const item of persona?.script || []) out[item.alias] = item.answer;
  return out;
}

module.exports = { loadPersona, scriptedQuestions, scriptAnswers };
