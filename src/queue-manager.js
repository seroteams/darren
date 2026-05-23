const fs = require("node:fs");
const path = require("node:path");

const { loadAxes, validateAxisState } = require("./axes");
const { newAlias, saveQuestion, listAllAliases } = require("./questions");
const { getArc } = require("./meeting-arcs");
const cost = require("./cost");

const ROOT = path.join(__dirname, "..");
const PROMPT_PATH = path.join(ROOT, "prompts", "plan-turn.md");

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
  const template = fs.readFileSync(PROMPT_PATH, "utf8");
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
  const isFinalTurn = Number(remainingBudget) === 1;
  const filled = template
    .replace("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replace("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replace("{{NAME}}", ctx.name || "(not provided)")
    .replace("{{ROLE}}", ctx.role || "(not provided)")
    .replace("{{SENIORITY}}", ctx.seniority || "(not provided)")
    .replace(/\{\{MEETING_TYPE\}\}/g, ctx.meetingType)
    .replace("{{TRANSCRIPT_JSON}}", JSON.stringify(transcriptSummary, null, 2))
    .replace("{{LAST_QUESTION_JSON}}", JSON.stringify(lastQuestion, null, 2))
    .replace("{{LAST_ANSWER}}", lastAnswer || "(skipped)")
    .replace("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2))
    .replace("{{REMAINING_QUEUE_JSON}}", JSON.stringify(queueSummary, null, 2))
    .replace("{{REMAINING_BUDGET}}", String(remainingBudget))
    .replace("{{TURN_NUMBER}}", String(turnNumber ?? "?"))
    .replace("{{TOTAL_TURNS}}", String(totalTurns ?? "?"))
    .replace("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc, null, 2))
    .replace("{{TONE_REGISTER}}", arc.tone_register)
    .replace("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replace("{{CURRENT_STAGE_HINT}}", currentStageHint)
    .replace(/\{\{ARC_PROGRESS_JSON\}\}/g, JSON.stringify(arcProgress, null, 2))
    .replace(/\{\{CONSECUTIVE_DRILL_COUNT\}\}/g, String(consecutiveDrillCount))
    .replace(/\{\{IS_FINAL_TURN\}\}/g, isFinalTurn ? "true" : "false")
    .replace(/\{\{CLOSER_ALIAS\}\}/g, closerAlias || "(none)");

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
  // Skipped/empty answers are handled upstream — this only fires for short non-empty.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.length <= 3;
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
  const shallowIssues = [];
  // Defence in depth: if the answer was shallow (<=3 tokens, non-empty, not a skip),
  // zero out any positive deltas the planner returned. Tone is not signal — content is.
  // We leave negative deltas alone: a short "nothing" can legitimately read as absence.
  const answerIsSkip = !lastAnswer || lastAnswer === "(skipped)";
  if (!answerIsSkip && isShallowAnswer(lastAnswer)) {
    for (const axis of Object.keys(rawDeltas)) {
      if (rawDeltas[axis] > 0) {
        shallowIssues.push(`shallow answer "${lastAnswer.trim()}" — zeroed positive ${axis} (+${rawDeltas[axis]})`);
        rawDeltas[axis] = 0;
      }
    }
  }
  const { deltas, issues: sigIssues } = clampToSignature(rawDeltas, lastQuestion.axis_effects || {});
  const assessment = {
    deltas,
    note: parsed.assessment?.note || "",
  };

  const askedAliases = new Set((transcript || []).map((t) => t.question.alias));
  const { queue: newQueue, issues: queueIssues } = reconcileQueue(parsed.new_queue, {
    remainingQueue,
    askedAliases,
  });

  return {
    assessment,
    newQueue,
    issues: [...shallowIssues, ...sigIssues, ...queueIssues],
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
  computeArcProgress,
  computeConsecutiveDrillCount,
};
