const fs = require("node:fs");

const { loadAxes, validateAxisState } = require("./axes");
const { newAlias, saveQuestion, listAllAliases } = require("./questions");
const { getArc } = require("./meeting-arcs");
const { promptFor } = require("./one-on-one-types");
const cost = require("./cost");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("planner");

const AXIS_IDS = ["wellbeing", "engagement", "clarity", "growth"];
const ALLOWED_DELTAS = [-3, -1, 0, 1, 3];
const MAX_QUEUE = 12;

const AXIS_EFFECT_ITEM = {
  type: "object",
  properties: {
    axis: { type: "string", enum: AXIS_IDS },
    delta: { type: "integer", enum: ALLOWED_DELTAS },
  },
  required: ["axis", "delta"],
  additionalProperties: false,
};

const QUEUE_ITEM = {
  type: "object",
  properties: {
    ref_alias: { type: ["string", "null"] },
    label: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    purpose: { type: "string", enum: ["wellbeing", "topic", "competency"] },
    stage: { type: ["string", "null"] },
    axis_effects: { type: "array", items: AXIS_EFFECT_ITEM },
  },
  required: ["ref_alias", "label", "name", "description", "purpose", "stage", "axis_effects"],
  additionalProperties: false,
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    assessment: {
      type: "object",
      properties: {
        deltas: { type: "array", items: AXIS_EFFECT_ITEM },
        note: { type: "string" },
      },
      required: ["deltas", "note"],
      additionalProperties: false,
    },
    new_queue: { type: "array", items: QUEUE_ITEM },
  },
  required: ["assessment", "new_queue"],
  additionalProperties: false,
};

function computeArcProgress(transcript, arc) {
  const progress = {};
  for (const stage of arc.arc) progress[stage.id] = 0;
  for (const t of transcript || []) {
    const s = t?.question?.stage;
    if (s && Object.prototype.hasOwnProperty.call(progress, s)) progress[s] += 1;
  }
  return progress;
}

function computeConsecutiveDrillCount(transcript, lastQuestion) {
  if (!lastQuestion?.stage) return 0;
  let count = 0;
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i]?.question;
    if (!q) break;
    if (q.source === "planner_added" && q.stage === lastQuestion.stage) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

// D1 — stages whose arc_progress < target_questions, in arc order.
function computeRemainingStages(transcript, arc) {
  const progress = computeArcProgress(transcript, arc);
  return arc.arc
    .map((stage) => ({
      id: stage.id,
      label: stage.label,
      intent: stage.intent,
      target_questions: stage.target_questions,
      arc_progress: progress[stage.id] || 0,
    }))
    .filter((s) => s.arc_progress < s.target_questions);
}

// D3 — most recent prior turn's realized deltas (used for snap-back).
function computeLastRealizedDeltas(transcript) {
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const d = t[i]?.realized_deltas;
    if (d && Object.keys(d).length > 0) return d;
  }
  return {};
}

// D4 — consecutive trailing planner_added items with purpose=wellbeing.
function computeConsecutiveWellbeingClarifierCount(transcript) {
  let count = 0;
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i]?.question;
    if (!q) break;
    if (q.source === "planner_added" && q.purpose === "wellbeing") count += 1;
    else break;
  }
  return count;
}

// D5 — session-wide count of planner_added items with stage=null
// (thread-follows that left the arc rather than staying inside it).
function computeOffArcDrillCount(transcript) {
  let count = 0;
  for (const t of transcript || []) {
    const q = t?.question;
    if (q?.source === "planner_added" && (q.stage === null || q.stage === undefined)) {
      count += 1;
    }
  }
  return count;
}

function buildMessages({
  axes,
  focusPoints,
  ctx,
  transcript,
  lastQuestion,
  lastAnswer,
  axisState,
  remainingQueue,
  remainingBudget,
  turnNumber,
  totalTurns,
  closerAlias,
}) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "planTurn"), "utf8");
  const arc = getArc(ctx.meetingType);
  const transcriptSummary = (transcript || []).map((t) => ({
    alias: t.question.alias,
    name: t.question.name,
    answer: t.answer,
    skipped: t.skipped,
  }));
  const queueSummary = (remainingQueue || []).map((q) => ({
    alias: q.alias,
    label: q.label,
    name: q.name,
    description: q.description,
    purpose: q.purpose,
    stage: q.stage ?? null,
    axis_effects: q.axis_effects,
  }));
  const currentStageHint = lastQuestion?.stage || "(unknown)";
  const arcProgress = computeArcProgress(transcript, arc);
  const consecutiveDrillCount = computeConsecutiveDrillCount(transcript, lastQuestion);
  const remainingStages = computeRemainingStages(transcript, arc);
  const lastRealizedDeltas = computeLastRealizedDeltas(transcript);
  const consecutiveWellbeingClarifierCount = computeConsecutiveWellbeingClarifierCount(transcript);
  const offArcDrillCount = computeOffArcDrillCount(transcript);
  const isFinalTurn = Number(remainingBudget) === 1;
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{ROLE}}", ctx.role || "(not provided)")
    .replaceAll("{{SENIORITY}}", ctx.seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcriptSummary, null, 2))
    .replaceAll("{{LAST_QUESTION_JSON}}", JSON.stringify(lastQuestion, null, 2))
    .replaceAll("{{LAST_ANSWER}}", lastAnswer || "(skipped)")
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2))
    .replaceAll("{{REMAINING_QUEUE_JSON}}", JSON.stringify(queueSummary, null, 2))
    .replaceAll("{{REMAINING_BUDGET}}", String(remainingBudget))
    .replaceAll("{{TURN_NUMBER}}", String(turnNumber ?? "?"))
    .replaceAll("{{TOTAL_TURNS}}", String(totalTurns ?? "?"))
    .replaceAll("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc, null, 2))
    .replaceAll("{{TONE_REGISTER}}", arc.tone_register)
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replaceAll("{{CURRENT_STAGE_HINT}}", currentStageHint)
    .replaceAll("{{ARC_PROGRESS_JSON}}", JSON.stringify(arcProgress, null, 2))
    .replaceAll("{{CONSECUTIVE_DRILL_COUNT}}", String(consecutiveDrillCount))
    .replaceAll("{{REMAINING_STAGES_JSON}}", JSON.stringify(remainingStages, null, 2))
    .replaceAll("{{LAST_REALIZED_DELTAS_JSON}}", JSON.stringify(lastRealizedDeltas, null, 2))
    .replaceAll("{{CONSECUTIVE_WELLBEING_CLARIFIER_COUNT}}", String(consecutiveWellbeingClarifierCount))
    .replaceAll("{{OFF_ARC_DRILL_COUNT}}", String(offArcDrillCount))
    .replaceAll("{{IS_FINAL_TURN}}", isFinalTurn ? "true" : "false")
    .replaceAll("{{CLOSER_ALIAS}}", closerAlias || "(none)");

  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    filled,
    system: systemMatch ? systemMatch[1].trim() : "",
    user: userMatch ? userMatch[1].trim() : filled,
  };
}

async function callOpenAI({ system, user, model }) {
  return callAI({
    system,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: "turn_plan",
    temperature: 0.4,
    model,
    costLabel: "04-plan-turn",
  });
}

function snapToAllowedDelta(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return ALLOWED_DELTAS.reduce((best, d) => (Math.abs(d - n) < Math.abs(best - n) ? d : best));
}

function toAxisObject(effects) {
  const out = {};
  for (const e of effects || []) {
    if (e && AXIS_IDS.includes(e.axis)) out[e.axis] = snapToAllowedDelta(e.delta);
  }
  return out;
}

// Enforce the question's signature: drop axes not in signature, clamp
// magnitude to the signature's magnitude. Returns the clamped delta object
// plus a list of violations for logging.
function clampToSignature(rawDeltas, signature) {
  const sigKeys = Object.keys(signature || {});
  const deltas = {};
  const issues = [];
  for (const axis of AXIS_IDS) {
    const rawDelta = rawDeltas[axis];
    if (rawDelta === undefined || rawDelta === null) continue;
    if (!sigKeys.includes(axis)) {
      issues.push(`dropped off-signature delta: ${axis} ${rawDelta > 0 ? "+" : ""}${rawDelta}`);
      continue;
    }
    const mag = Math.abs(signature[axis]);
    const clamped = Math.max(-mag, Math.min(mag, rawDelta));
    if (clamped !== rawDelta) {
      issues.push(`clamped ${axis} ${rawDelta} → ${clamped} (signature magnitude ${mag})`);
    }
    if (clamped !== 0) deltas[axis] = clamped;
  }
  return { deltas, issues };
}

function axisCoverage(axisState) {
  const out = {};
  for (const id of AXIS_IDS) {
    const slot = axisState[id];
    // Use ?? not || so that legitimate negative scores aren't coerced to 0
    out[id] = { score: slot?.score ?? 0, touches: slot?.history?.length ?? 0 };
  }
  return out;
}

// Returns true iff a reconstructed queue item matches the referenced existing
// question on the canonical fields (ignoring whitespace).
function isUnchanged(refOriginal, incoming) {
  if (!refOriginal) return false;
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  if (norm(refOriginal.name) !== norm(incoming.name)) return false;
  if (norm(refOriginal.label) !== norm(incoming.label)) return false;
  if (norm(refOriginal.description) !== norm(incoming.description)) return false;
  const a = refOriginal.axis_effects || {};
  const b = toAxisObject(incoming.axis_effects);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
}

// Reconcile AI-returned items against the existing remaining queue +
// transcript. Produces the materialised queue of question objects.
function reconcileQueue(rawNewQueue, { remainingQueue, askedAliases }) {
  const byAlias = new Map(remainingQueue.map((q) => [q.alias, q]));
  const existingAliases = listAllAliases();
  for (const q of remainingQueue) existingAliases.add(q.alias);
  for (const a of askedAliases) existingAliases.add(a);
  const out = [];
  const issues = [];
  const usedAliases = new Set();

  for (const item of rawNewQueue || []) {
    if (!item || !Array.isArray(item.axis_effects) || item.axis_effects.length === 0) {
      issues.push(`dropped item with empty axis_effects: ${item?.label || "(no label)"}`);
      continue;
    }
    const ref = item.ref_alias ? byAlias.get(item.ref_alias) : null;
    if (item.ref_alias && !ref) {
      issues.push(`ref_alias ${item.ref_alias} not in remaining queue — treating as new`);
    }
    if (item.ref_alias && askedAliases.has(item.ref_alias)) {
      issues.push(`ref_alias ${item.ref_alias} already asked — dropping`);
      continue;
    }

    if (ref && isUnchanged(ref, item)) {
      if (usedAliases.has(ref.alias)) {
        issues.push(`duplicate reuse of alias ${ref.alias} — skipping second`);
        continue;
      }
      usedAliases.add(ref.alias);
      out.push(ref);
      continue;
    }

    const baseLabel = item.label || (ref ? ref.label : "unnamed");
    const alias = newAlias(baseLabel, new Set([...existingAliases, ...usedAliases]));
    existingAliases.add(alias);
    usedAliases.add(alias);
    const source = ref ? `reworded_from:${ref.alias}` : "planner_added";
    const q = {
      alias,
      label: item.label,
      name: item.name,
      description: item.description,
      purpose: item.purpose,
      stage: item.stage ?? ref?.stage ?? null,
      axis_effects: toAxisObject(item.axis_effects),
      source,
    };
    saveQuestion(q);
    out.push(q);
  }

  // Cap length
  if (out.length > MAX_QUEUE) {
    issues.push(`truncated queue from ${out.length} to ${MAX_QUEUE}`);
    out.length = MAX_QUEUE;
  }

  return { queue: out, issues };
}

function isShallowAnswer(answer) {
  if (!answer || typeof answer !== "string") return false;
  const trimmed = answer.trim();
  if (!trimmed) return false;
  if (trimmed === "(skipped)") return false;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.length <= 3) return true;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const FILLER_ONLY =
    /^(yeah|yes|yep|yup|ok|okay|fine|good|great|sure|cool|thanks|thank you|not bad|doing fine|i am fine|im fine|today is fine|its fine|it's fine|they are okay|every day|every time)$/;
  return FILLER_ONLY.test(normalized);
}

function noteMarksShallow(note) {
  return typeof note === "string" && note.includes("[SHALLOW]");
}

function detectClarityMisalignment(answer) {
  if (!answer || typeof answer !== "string") return false;
  const lower = answer.toLowerCase();
  if (/\bmay think this\b.*\bmay think that\b/.test(lower)) return true;
  if (/\b(i|my|me)\b/.test(lower) && /\b(boss|manager|lead)\b/.test(lower)) {
    if (/\b(think|expects|expected|want|needs|learn|understand|align)\b/.test(lower)) return true;
  }
  if (/\b(not aligned|misaligned|on different pages|different expectations)\b/.test(lower)) return true;
  return false;
}

function expandSignatureForSignals(signature, answer) {
  const sig = { ...(signature || {}) };
  if (detectClarityMisalignment(answer) && sig.clarity == null) {
    sig.clarity = 3;
  }
  return sig;
}

function applyShallowGate(rawDeltas, { lastAnswer, note, issues }) {
  const answerIsSkip = !lastAnswer || lastAnswer === "(skipped)";
  const shallow = !answerIsSkip && (isShallowAnswer(lastAnswer) || noteMarksShallow(note));
  if (!shallow) return false;
  for (const axis of Object.keys(rawDeltas)) {
    if (rawDeltas[axis] !== 0) {
      issues.push(`shallow answer — zeroed ${axis} (${rawDeltas[axis] > 0 ? "+" : ""}${rawDeltas[axis]})`);
      rawDeltas[axis] = 0;
    }
  }
  return true;
}

function applyMisalignmentClarity(rawDeltas, { lastAnswer, signature, issues }) {
  if (!detectClarityMisalignment(lastAnswer)) return;
  if (!Object.prototype.hasOwnProperty.call(signature, "clarity")) return;
  const mag = Math.abs(signature.clarity);
  const current = rawDeltas.clarity;
  if (current == null || current >= 0) {
    const applied = -Math.min(mag, 1);
    rawDeltas.clarity = applied;
    issues.push(`misalignment signal — applied clarity ${applied}`);
  }
}

function enforceAxisCoverage({ newQueue, axisState, turnNumber, issues }) {
  if (turnNumber < 4 || !Array.isArray(newQueue) || !newQueue.length) return newQueue;
  const untouched = AXIS_IDS.filter((id) => (axisState[id]?.history?.length ?? 0) === 0);
  if (!untouched.length) return newQueue;
  const priority = ["clarity", "engagement", "wellbeing", "growth"].find((id) => untouched.includes(id));
  if (!priority) return newQueue;
  const first = newQueue[0];
  if (!first || typeof first.axis_effects !== "object") return newQueue;
  if (first.axis_effects[priority]) return newQueue;
  first.axis_effects[priority] = 3;
  issues.push(`coverage: injected ${priority} into next question (0 touches after turn ${turnNumber})`);
  return newQueue;
}

async function planTurn({
  focusPoints,
  ctx,
  transcript,
  lastQuestion,
  lastAnswer,
  axisState,
  remainingQueue,
  remainingBudget,
  turnNumber,
  totalTurns,
  closerAlias,
  model = getDefaultModel(),
}) {
  validateAxisState(axisState);

  const skipShortcutEligible = (!lastAnswer || lastAnswer === "(skipped)")
    && Number(remainingBudget) !== 1
    && Array.isArray(remainingQueue) && remainingQueue.length > 0
    && (transcript || []).slice(-2).filter((t) => t?.skipped).length < 2;
  if (skipShortcutEligible) {
    return {
      assessment: { deltas: {}, note: "[SKIP] no signal — planner bypassed, queue carried forward" },
      newQueue: remainingQueue,
      issues: [],
      prompt: null,
      response: null,
    };
  }

  const axes = loadAxes();
  const msgs = buildMessages({
    axes,
    focusPoints,
    ctx,
    transcript,
    lastQuestion,
    lastAnswer,
    axisState: axisCoverage(axisState),
    remainingQueue,
    remainingBudget,
    turnNumber,
    totalTurns,
    closerAlias,
  });
  const raw = await callOpenAI({ ...msgs, model });
  const parsed = parseAIJson(raw, "Queue planner", ["assessment", "new_queue"]);

  const rawDeltas = toAxisObject(parsed.assessment?.deltas);
  const gateIssues = [];
  applyShallowGate(rawDeltas, {
    lastAnswer,
    note: parsed.assessment?.note || "",
    issues: gateIssues,
  });

  const effectiveSignature = expandSignatureForSignals(lastQuestion.axis_effects || {}, lastAnswer);
  applyMisalignmentClarity(rawDeltas, {
    lastAnswer,
    signature: effectiveSignature,
    issues: gateIssues,
  });

  const { deltas, issues: sigIssues } = clampToSignature(rawDeltas, effectiveSignature);
  const assessment = {
    deltas,
    note: parsed.assessment?.note || "",
  };

  const askedAliases = new Set((transcript || []).map((t) => t.question.alias));
  const { queue: reconciledQueue, issues: queueIssues } = reconcileQueue(parsed.new_queue, {
    remainingQueue,
    askedAliases,
  });
  const newQueue = enforceAxisCoverage({
    newQueue: reconciledQueue,
    axisState,
    turnNumber: turnNumber ?? (transcript || []).length,
    issues: gateIssues,
  });

  return {
    assessment,
    newQueue,
    issues: [...gateIssues, ...sigIssues, ...queueIssues],
    prompt: msgs.filled,
    response: raw,
  };
}

module.exports = {
  planTurn,
  buildMessages,
  callOpenAI,
  axisCoverage,
  reconcileQueue,
  clampToSignature,
  isShallowAnswer,
  noteMarksShallow,
  detectClarityMisalignment,
  expandSignatureForSignals,
  applyShallowGate,
  applyMisalignmentClarity,
  enforceAxisCoverage,
  computeArcProgress,
  computeConsecutiveDrillCount,
  computeRemainingStages,
  computeLastRealizedDeltas,
  computeConsecutiveWellbeingClarifierCount,
  computeOffArcDrillCount,
};
