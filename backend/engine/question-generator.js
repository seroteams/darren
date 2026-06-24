const fs = require("node:fs");

const { logStage } = require("./session");
const { loadAxes, AXIS_IDS } = require("./axes");
const { newAlias, saveQuestion, listAllAliases } = require("./questions");
const { getArc } = require("./meeting-arcs");
const { promptFor } = require("./one-on-one-types");
const { resolveSelectedFocus } = require("./selected-focus.ts");
const { loadLexicon } = require("./lexicon");
const { findJargon } = require("./golden-checks");
const { isRelationalArc } = require("./relational-arcs");
const { splitSystemUser } = require("./prompt-utils.ts");
const { loadRoleProfile, renderRoleProfileBlock, roleProfileLogInfo } = require("./role-profile");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("bank");

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

function renderPrepText(value) {
  return value && String(value).trim() ? String(value).trim() : "(none)";
}

function renderPrepListenFor(items) {
  return Array.isArray(items) && items.length ? JSON.stringify(items, null, 2) : "(none)";
}

// The bank item the model tagged as the prep-anchored opener (or null).
function findPrepOpener(items) {
  return (items || []).find((q) => /prep opener/i.test(q.label || "")) || null;
}

// A warm question is a pre-written opener/intro: the meeting's first arc stage
// (or self_read) AND a seed/semi_set source. The prep opener (source
// "generated") and planner thread-follows are never warm, so they don't get
// counted into the leading warm run.
function warmIntroFilter(meetingType) {
  const anchorStageId = getArc(meetingType).arc[0]?.id || null;
  const warmStages = new Set(["self_read", anchorStageId].filter(Boolean));
  return (q) =>
    warmStages.has(q.stage) &&
    (q.source === "seed" || q.source === "semi_set" || /^q_(intro|open)/.test(q.alias || ""));
}

// Place the prep opener right after the leading run of warm intro questions, so
// it's the first SUBSTANTIVE question — not buried behind the fixed intro probes
// or a planner thread-follow. minIndex keeps it from ever being literally first
// during initial assembly (when the warm opener sits at position 0).
function placePrepOpener(queue, prepOpener, meetingType, minIndex = 0) {
  if (!prepOpener) return queue;
  const isWarm = warmIntroFilter(meetingType);
  const rest = (queue || []).filter((q) => q.alias !== prepOpener.alias);
  let insertAt = 0;
  while (insertAt < rest.length && isWarm(rest[insertAt])) insertAt += 1;
  if (insertAt < minIndex) insertAt = minIndex;
  return [...rest.slice(0, insertAt), prepOpener, ...rest.slice(insertAt)];
}

// Initial queue assembly: intro questions + bank, with the prep opener moved up
// to just after the warm opener. No-op without a prep brief or tagged opener
// (e.g. the seed-bank fallback).
function assembleQueueWithPrepOpener(introQueue, bank, prep, meetingType) {
  const base = [...(introQueue || []), ...(bank || [])];
  if (!prep?.openingQuestion || !bank?.length || !introQueue?.length) return base;
  const opener = findPrepOpener(bank);
  if (!opener) return base;
  return placePrepOpener(base, opener, meetingType, 1);
}

// Per-turn pin: keep the prep opener as the first substantive question until it
// has been asked. The live planner re-plans the whole queue each turn and will
// otherwise bury or drop it (it doesn't know the opener is special). Re-inserts
// it if the planner dropped it. No-op once it's been asked.
function pinPrepOpenerEarly(queue, prepOpener, askedAliases, meetingType) {
  if (!prepOpener) return queue;
  if (askedAliases && typeof askedAliases.has === "function" && askedAliases.has(prepOpener.alias)) {
    return queue;
  }
  return placePrepOpener(queue, prepOpener, meetingType, 0);
}

// Same trust rule as catalogueForArc (src/generate.js), one layer down: in a
// relational arc the bank must not contain evaluative questions. Prompt-side
// instruction here; the post-parse filter in generateBank is the hard gate.
function relationalArcRules(meetingType) {
  if (!isRelationalArc(meetingType)) return "";
  return [
    "**Relational-arc rule (machine-enforced):** This meeting type is a relational check-in, not an assessment.",
    'Every question\'s `purpose` MUST be `wellbeing` or `topic` — never `competency`. Do not ask the report to',
    'prove readiness, leadership, or skill ("trust you in that next role", "what are you doing to drive X") —',
    'probe situations, not character. Items with `purpose: "competency"` are dropped before the bank is saved.',
  ].join(" ");
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
  prep,
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
    .replaceAll("{{RELATIONAL_ARC_RULES}}", relationalArcRules(meetingType))
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replaceAll("{{CONVERSATION_PREFER_TERMS}}", renderPreferTerms(lexicon.preferTerms))
    .replaceAll("{{CONVERSATION_PREFER_PHRASES}}", renderPreferPhrases(lexicon.preferPhrases))
    .replaceAll("{{CONVERSATION_AVOID_PHRASES}}", renderAvoidPhrases(lexicon.avoidPhrases))
    .replaceAll("{{PREP_OPENING_QUESTION}}", renderPrepText(prep?.openingQuestion))
    .replaceAll("{{PREP_CORE_ISSUE}}", renderPrepText(prep?.coreIssue))
    .replaceAll("{{PREP_LISTEN_FOR_JSON}}", renderPrepListenFor(prep?.listenFor))
    .replaceAll(
      "{{ROLE_PROFILE_BLOCK}}",
      renderRoleProfileBlock(loadRoleProfile({ role, seniority }), { slice: "full", meetingType })
    );

  return splitSystemUser(filled);
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
    prep,
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
    prep,
  });
  const raw = await callOpenAI({ ...messages, model });
  const parsed = parseAIJson(raw, "Question generator", ["questions"]);

  const existing = listAllAliases();
  const saved = [];
  const droppedJargon = [];
  const droppedCompetencyForArc = [];
  const relational = isRelationalArc(meetingType);
  for (const q of parsed.questions || []) {
    // Plain-language backstop — drop (never rewrite) a generated question that
    // uses banned jargon; the prompt's plain-speech lint does the main work.
    const jargon = findJargon(`${q.name || ""} ${q.description || ""}`);
    if (jargon) {
      droppedJargon.push({ label: q.label, name: q.name, term: jargon });
      continue;
    }
    // Relational-arc gate — drop (never relabel) competency questions for
    // Bi-weekly / Something-feels-off. Mirrors catalogueForArc on focus points:
    // the model can't ship what we don't keep.
    if (relational && q.purpose === "competency") {
      droppedCompetencyForArc.push({ label: q.label, name: q.name });
      continue;
    }
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
    inputs: { focusPoints, name, role, seniority, meetingType, notes, model, roleProfile: roleProfileLogInfo({ role, seniority }) },
    prompt: messages.filled,
    response: {
      raw,
      saved_aliases: saved.map((q) => q.alias),
      ...(droppedJargon.length ? { dropped_jargon: droppedJargon } : {}),
      ...(droppedCompetencyForArc.length
        ? { dropped_competency_for_arc: droppedCompetencyForArc }
        : {}),
    },
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

module.exports = {
  generateBank,
  generateBankWithFallback,
  buildMessages,
  callOpenAI,
  assembleQueueWithPrepOpener,
  findPrepOpener,
  pinPrepOpenerEarly,
};
