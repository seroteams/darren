// Deterministic tail of the pipeline, replayed on FROZEN inputs.
//
// gate.js runs the live (paid) pipeline and then applies the trust checks. This
// lib is just that second half — post-process guards + trust gates — pulled out
// so it can run on a saved run with NO API call. Same engine code, $0.
//
//   checkFromInputs({ rawResponse, ctx, focusPoints, transcript, axisState,
//                     managerNotes, bankQuestions, meetingType }) -> { briefing, checks }
//   checkFromSessionDir(dir) -> { inputs, briefing, checks }   (loads a run folder)

import fs from "node:fs";
import path from "node:path";

import { applyManagerBriefingPostProcess } from "../../backend/engine/reviewer.ts";
import { runTrustChecks } from "../../evals/trust-checks.ts";
import { loadBankQuestions } from "./session-scores.ts";
import type { Briefing } from "../../backend/shared/briefing.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
// The eval wire is schema-constrained; an axes array is the structural minimum
// (same pragmatic narrowing the engine + trust-checks use for model JSON).
function isBriefingShape(v: unknown): v is Briefing {
  return isObjectRecord(v) && Array.isArray(v.axes);
}

// The serialized axis state on disk is structurally Record<axisId, {score, history}>;
// materialise it into the shape applyManagerBriefingPostProcess expects (identity
// for a real frozen run — the post-process only reads score + history).
interface AxisSlotInput {
  score: number;
  history: Array<{ q: string; delta: number; answer_excerpt: string }>;
}
function toAxisStateInput(v: unknown): Record<string, AxisSlotInput> {
  const out: Record<string, AxisSlotInput> = {};
  for (const [k, val] of Object.entries(asRecord(v))) {
    const slot = asRecord(val);
    out[k] = {
      score: typeof slot.score === "number" ? slot.score : 0,
      history: (Array.isArray(slot.history) ? slot.history : []).map((h) => {
        const hr = asRecord(h);
        return { q: asString(hr.q), delta: Number(hr.delta) || 0, answer_excerpt: asString(hr.answer_excerpt) };
      }),
    };
  }
  return out;
}

function loadJson(p: string, fallback: unknown = undefined): unknown {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Parse a saved model response, tolerating the {raw:"<json>"} double-encoding the
// pipeline sometimes writes (same tolerance as scripts/gate.js loadBriefing).
function parseSavedResponse(raw: unknown): unknown {
  let b: unknown = raw;
  if (typeof b === "string") b = JSON.parse(b);
  if (isObjectRecord(b) && typeof b.raw === "string") b = JSON.parse(b.raw);
  return b;
}

// Re-run the 4 post-process guards and the 11 trust gates against CURRENT code.
// Deterministic on the frozen inputs + whatever the repo config resolves to now
// (arcs, focus catalogue, ban lists, role profiles) — which is exactly the
// surface we want a regression to move. `input` arrives loose (a saved run folder
// or a replay case), so narrow it here as the original JS destructure did.
function checkFromInputs(input: unknown = {}) {
  const o = asRecord(input);
  const ctx = asRecord(o.ctx);
  const transcript = o.transcript;
  const axisState = o.axisState;
  const meetingType = typeof o.meetingType === "string" ? o.meetingType : undefined;

  const parsed = parseSavedResponse(o.rawResponse);
  const checksFor = (briefing: unknown) =>
    runTrustChecks({
      briefing,
      transcript,
      managerNotes: o.managerNotes ?? "",
      bankQuestions: o.bankQuestions ?? [],
      focusPoints: o.focusPoints ?? [],
      meetingType: meetingType || asString(ctx.meetingType),
      ctx: { role: asString(ctx.role), seniority: asString(ctx.seniority) },
    });

  // Frozen runs always carry a real briefing; for a malformed one (unreachable
  // here) the gates would flag SCHEMA_INVALID anyway, so skip the post-process
  // (it expects a Briefing) and report on the raw parsed value directly.
  if (!isBriefingShape(parsed)) {
    return { briefing: parsed, checks: checksFor(parsed) };
  }
  const briefing = applyManagerBriefingPostProcess(parsed, toAxisStateInput(axisState), Array.isArray(transcript) ? transcript : []);
  const checks = checksFor(briefing);
  return { briefing, checks };
}

// Pull the frozen inputs out of a finished run folder. Mirrors what gate.js loads
// from a fresh live run: raw evaluation response + the context the gates need.
function extractInputs(sessionDir: string) {
  const evalInputs = loadJson(path.join(sessionDir, "05-evaluation", "inputs.json"));
  if (!evalInputs) throw new Error(`no 05-evaluation/inputs.json in ${sessionDir}`);
  const inputsRec = asRecord(evalInputs);
  const rawResponse = loadJson(path.join(sessionDir, "05-evaluation", "response.json"));
  if (rawResponse == null) throw new Error(`no 05-evaluation/response.json in ${sessionDir}`);
  const ctx = asRecord(inputsRec.ctx);
  return {
    rawResponse,
    ctx: { name: asString(ctx.name), role: asString(ctx.role), seniority: asString(ctx.seniority) },
    meetingType: asString(ctx.meetingType),
    managerNotes: inputsRec.notes || ctx.notes || "",
    focusPoints: inputsRec.focusPoints || [],
    transcript: loadJson(path.join(sessionDir, "transcript.json"), []),
    axisState: inputsRec.axisState || {},
    bankQuestions: loadBankQuestions(sessionDir),
  };
}

function checkFromSessionDir(sessionDir: string) {
  const inputs = extractInputs(sessionDir);
  const { briefing, checks } = checkFromInputs(inputs);
  return { inputs, briefing, checks };
}

export { checkFromInputs, checkFromSessionDir, extractInputs, parseSavedResponse };
