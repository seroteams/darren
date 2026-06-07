const fs = require("node:fs");

const { logStage } = require("./session");
const { loadAxes } = require("./axes");
const { newAlias, saveQuestion, listAllAliases } = require("./questions");
const { getArc } = require("./meeting-arcs");
const { promptFor } = require("./one-on-one-types");
const { resolveSelectedFocus } = require("./selected-focus");
const { loadLexicon } = require("./lexicon");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("bank");

const AXIS_IDS = ["wellbeing", "engagement", "clarity", "growth"];
const ALLOWED_DELTAS = [3, 1, -1, -3];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          purpose: { type: "string", enum: ["wellbeing", "topic", "competency"] },
          stage: { type: "string" },
          axis_effects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                axis: { type: "string", enum: AXIS_IDS },
                delta: { type: "integer", enum: ALLOWED_DELTAS },
              },
              required: ["axis", "delta"],
              additionalProperties: false,
            },
          },
        },
        required: ["label", "name", "description", "purpose", "stage", "axis_effects"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

function renderPreferTerms(terms) {
  if (!terms || !terms.length) return "(none yet)";
  return terms.join(", ");
}

function renderPreferPhrases(phrases) {
  if (!phrases || !phrases.length) return "(none yet)";
  return phrases.map((p) => `- "${p}"`).join("\n");
}

function renderAvoidPhrases(items) {
  if (!items || !items.length) return "(none yet)";
  return items
    .map((it) => {
      const reason = it.reason ? ` — ${it.reason}` : "";
      const better = it.better_as ? ` Better: "${it.better_as}"` : "";
      return `- "${it.phrase}"${reason}${better}`;
    })
    .join("\n");
}

function buildMessages({
  axes,
  focusPoints,
  name,
  role,
  seniority,
  meetingType,
  notes,
  existingQueue,
  selectedFocus,
}) {
  const template = fs.readFileSync(promptFor(meetingType, "questionBank"), "utf8");
  const arc = getArc(meetingType);
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes, focusPoints });
  const lexicon = loadLexicon({ meetingType, role, seniority });
  const queueSummary = (existingQueue || []).map((q) => ({
    alias: q.alias,
    label: q.label,
    name: q.name,
    description: q.description,
    stage: q.stage ?? null,
    axis_effects: q.axis_effects,
  }));
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{NAME}}", name || "(not provided)")
    .replaceAll("{{ROLE}}", role || "(not provided)")
    .replaceAll("{{SENIORITY}}", seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", meetingType)
    .replaceAll("{{MANAGER_NOTES}}", notes || "(none)")
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{PRIMARY_FOCUS_ID}}", sf?.id || "(none)")
    .replaceAll("{{EXISTING_QUEUE_JSON}}", JSON.stringify(queueSummary, null, 2))
    .replaceAll("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc, null, 2))
    .replaceAll("{{TONE_REGISTER}}", arc.tone_register)
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replaceAll("{{CONVERSATION_PREFER_TERMS}}", renderPreferTerms(lexicon.preferTerms))
    .replaceAll("{{CONVERSATION_PREFER_PHRASES}}", renderPreferPhrases(lexicon.preferPhrases))
    .replaceAll("{{CONVERSATION_AVOID_PHRASES}}", renderAvoidPhrases(lexicon.avoidPhrases));

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
    schemaName: "question_bank",
    temperature: 0.7,
    model,
    costLabel: "03-question-bank",
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

async function generateBank(
  {
    focusPoints,
    name,
    role,
    seniority,
    meetingType,
    notes,
    existingQueue,
    selectedFocus,
    primaryFocusId,
  },
  { model = getDefaultModel(), session, stage = "03-question-bank" } = {}
) {
  const axes = loadAxes();
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes, focusPoints, primaryFocusId });
  const messages = buildMessages({
    axes,
    focusPoints,
    name,
    role,
    seniority,
    meetingType,
    notes,
    existingQueue,
    selectedFocus: sf,
  });
  const raw = await callOpenAI({ ...messages, model });
  const parsed = parseAIJson(raw, "Question generator", ["questions"]);

  const existing = listAllAliases();
  const saved = [];
  for (const q of parsed.questions || []) {
    const alias = newAlias(q.label, existing);
    existing.add(alias);
    const obj = {
      alias,
      label: q.label,
      name: q.name,
      description: q.description,
      purpose: q.purpose,
      stage: q.stage || null,
      axis_effects: toAxisObject(q.axis_effects),
      source: "generated",
    };
    saveQuestion(obj);
    saved.push(obj);
  }

  logStage(session, stage, {
    inputs: { focusPoints, name, role, seniority, meetingType, notes, model },
    prompt: messages.filled,
    response: { raw, saved_aliases: saved.map((q) => q.alias) },
  });

  return saved;
}

async function generateBankWithFallback(args, opts, { onFallback } = {}) {
  const { loadDir } = require("./questions");
  try {
    return await generateBank(args, opts);
  } catch (e) {
    onFallback?.(e);
    return loadDir("_seed");
  }
}

module.exports = { generateBank, generateBankWithFallback, buildMessages, callOpenAI };
