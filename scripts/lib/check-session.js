// Deterministic tail of the pipeline, replayed on FROZEN inputs.
//
// gate.js runs the live (paid) pipeline and then applies the trust checks. This
// lib is just that second half — post-process guards + trust gates — pulled out
// so it can run on a saved run with NO API call. Same engine code, $0.
//
//   checkFromInputs({ rawResponse, ctx, focusPoints, transcript, axisState,
//                     managerNotes, bankQuestions, meetingType }) -> { briefing, checks }
//   checkFromSessionDir(dir) -> { inputs, briefing, checks }   (loads a run folder)

const fs = require("node:fs");
const path = require("node:path");

const { applyManagerBriefingPostProcess } = require("../../backend/engine/reviewer.ts");
const { runTrustChecks } = require("../../evals/trust-checks");
const { loadBankQuestions } = require("./session-scores.ts");

function loadJson(p, fallback = undefined) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Parse a saved model response, tolerating the {raw:"<json>"} double-encoding the
// pipeline sometimes writes (same tolerance as scripts/gate.js loadBriefing).
function parseSavedResponse(raw) {
  let b = raw;
  if (typeof b === "string") b = JSON.parse(b);
  if (b && typeof b.raw === "string") b = JSON.parse(b.raw);
  return b;
}

// Re-run the 4 post-process guards and the 11 trust gates against CURRENT code.
// Deterministic on the frozen inputs + whatever the repo config resolves to now
// (arcs, focus catalogue, ban lists, role profiles) — which is exactly the
// surface we want a regression to move.
function checkFromInputs({
  rawResponse,
  ctx = {},
  focusPoints = [],
  transcript = [],
  axisState = {},
  managerNotes = "",
  bankQuestions = [],
  meetingType,
} = {}) {
  const parsed = parseSavedResponse(rawResponse);
  const briefing = applyManagerBriefingPostProcess(parsed, axisState, transcript);
  const checks = runTrustChecks({
    briefing,
    transcript,
    managerNotes,
    bankQuestions,
    focusPoints,
    meetingType: meetingType || ctx.meetingType,
    ctx: { role: ctx.role, seniority: ctx.seniority },
  });
  return { briefing, checks };
}

// Pull the frozen inputs out of a finished run folder. Mirrors what gate.js loads
// from a fresh live run: raw evaluation response + the context the gates need.
function extractInputs(sessionDir) {
  const evalInputs = loadJson(path.join(sessionDir, "05-evaluation", "inputs.json"));
  if (!evalInputs) throw new Error(`no 05-evaluation/inputs.json in ${sessionDir}`);
  const rawResponse = loadJson(path.join(sessionDir, "05-evaluation", "response.json"));
  if (rawResponse == null) throw new Error(`no 05-evaluation/response.json in ${sessionDir}`);
  const ctx = evalInputs.ctx || {};
  return {
    rawResponse,
    ctx: { name: ctx.name, role: ctx.role, seniority: ctx.seniority },
    meetingType: ctx.meetingType,
    managerNotes: evalInputs.notes || ctx.notes || "",
    focusPoints: evalInputs.focusPoints || [],
    transcript: loadJson(path.join(sessionDir, "transcript.json"), []),
    axisState: evalInputs.axisState || {},
    bankQuestions: loadBankQuestions(sessionDir),
  };
}

function checkFromSessionDir(sessionDir) {
  const inputs = extractInputs(sessionDir);
  const { briefing, checks } = checkFromInputs(inputs);
  return { inputs, briefing, checks };
}

module.exports = { checkFromInputs, checkFromSessionDir, extractInputs, parseSavedResponse };
