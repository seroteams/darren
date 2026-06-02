const fs = require("node:fs");

const { logStage } = require("./session");
const { loadAxes } = require("./axes");
const { promptFor, getArc, getType } = require("./one-on-one-types");
const { withPromptVersion } = require("./prompt-version");
const cost = require("./cost");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("evaluation");

const AXIS_IDS = ["wellbeing", "engagement", "clarity", "growth"];
const OVERLAP_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "to", "for", "with",
  "is", "are", "was", "were", "be", "been",
]);

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary_bullets: {
      type: "array",
      items: { type: "string" },
    },
    understanding_paragraph: { type: "string" },
    axes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: AXIS_IDS },
          score: { type: "integer" },
          meaning: { type: "string" },
        },
        required: ["id", "score", "meaning"],
        additionalProperties: false,
      },
    },
    brutal_truth_employee: { type: "string" },
    brutal_truth_manager: { type: "string" },
    next_actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          when: {
            type: "string",
            enum: ["today", "this week", "this month", "next 1:1"],
          },
          action: { type: "string" },
        },
        required: ["when", "action"],
        additionalProperties: false,
      },
    },
    watch_for: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "headline",
    "summary_bullets",
    "understanding_paragraph",
    "axes",
    "brutal_truth_employee",
    "brutal_truth_manager",
    "next_actions",
    "watch_for",
  ],
  additionalProperties: false,
};

function buildMessages({ ctx, focusPoints, transcript, axisState, notes }) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "evaluation"), "utf8");
  const axes = loadAxes();
  const arc = getArc(ctx.meetingType);
  let typeEvalRules = "";
  try {
    typeEvalRules = getType(ctx.meetingType).eval_rules || "";
  } catch {
    typeEvalRules = "";
  }
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{ROLE}}", ctx.role || "(not provided)")
    .replaceAll("{{SENIORITY}}", ctx.seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
    .replaceAll("{{TYPE_EVAL_RULES}}", typeEvalRules)
    .replaceAll("{{TONE_REGISTER}}", arc.tone_register)
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replaceAll("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc, null, 2))
    .replaceAll("{{MANAGER_NOTES}}", notes || "(none)")
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcript, null, 2))
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2));

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
    schemaName: "final_evaluation",
    temperature: 0.5,
    model,
    costLabel: "05-evaluation",
  });
}

function normalizeContentWords(text) {
  return String(text || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !OVERLAP_STOP_WORDS.has(word));
}

function fourGrams(words) {
  const grams = new Set();
  for (let i = 0; i <= words.length - 4; i += 1) {
    grams.add(words.slice(i, i + 4).join(" "));
  }
  return grams;
}

function fourGramOverlap(headline, bullet) {
  const headlineWords = normalizeContentWords(headline);
  const bulletWords = normalizeContentWords(bullet);
  if (headlineWords.length < 4 || bulletWords.length < 4) return 0;

  const headlineGrams = fourGrams(headlineWords);
  const bulletGrams = fourGrams(bulletWords);
  let overlap = 0;

  for (const gram of bulletGrams) {
    if (headlineGrams.has(gram)) overlap += 1;
  }
  return overlap;
}

function validateBriefingOverlap(briefing) {
  const issues = [];
  const headline = briefing?.headline || "";
  const bullets = Array.isArray(briefing?.summary_bullets) ? briefing.summary_bullets : [];

  bullets.forEach((bullet, idx) => {
    const overlap = fourGramOverlap(headline, bullet);
    if (overlap >= 1) {
      issues.push(
        `summary_bullets[${idx}] overlaps headline by ${overlap} four-gram(s)`
      );
    }
  });

  return { passed: issues.length === 0, issues };
}

async function evaluate(
  { ctx, focusPoints, transcript, axisState, notes },
  { model = getDefaultModel(), session, stage = "05-evaluation" } = {}
) {
  const msgs = buildMessages({ ctx, focusPoints, transcript, axisState, notes });
  const raw = await callOpenAI({ ...msgs, model });
  const evalPromptPath = promptFor(ctx.meetingType, "evaluation");

  logStage(session, stage, {
    inputs: withPromptVersion(
      { ctx, focusPoints, transcript, axisState, notes, model },
      evalPromptPath
    ),
    prompt: msgs.filled,
    response: raw,
  });

  const briefing = parseAIJson(raw, "Evaluator", ["headline", "axes", "next_actions"]);
  const validation = validateBriefingOverlap(briefing);

  if (!validation.passed) {
    logStage(session, stage, {
      inputs: { ctx, focusPoints, transcript, axisState, notes, model, validation },
      prompt: msgs.filled,
      response: raw,
    });
  }

  return briefing;
}

module.exports = { evaluate, buildMessages, callOpenAI, fourGramOverlap };
