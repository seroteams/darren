const fs = require("node:fs");
const path = require("node:path");

const { logStage } = require("./session");
const { loadAxes } = require("./axes");
const cost = require("./cost");

const ROOT = path.join(__dirname, "..");
const PROMPT_PATH = path.join(ROOT, "prompts", "final-evaluation.md");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("evaluation");

const AXIS_IDS = ["wellbeing", "engagement", "clarity", "growth"];

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
  const template = fs.readFileSync(PROMPT_PATH, "utf8");
  const axes = loadAxes();
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{ROLE}}", ctx.role || "(not provided)")
    .replaceAll("{{SENIORITY}}", ctx.seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
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

async function evaluate(
  { ctx, focusPoints, transcript, axisState, notes },
  { model = getDefaultModel(), session, stage = "05-evaluation" } = {}
) {
  const msgs = buildMessages({ ctx, focusPoints, transcript, axisState, notes });
  const raw = await callOpenAI({ ...msgs, model });

  logStage(session, stage, {
    inputs: { ctx, focusPoints, transcript, axisState, notes, model },
    prompt: msgs.filled,
    response: raw,
  });

  return parseAIJson(raw, "Evaluator", ["headline", "axes", "next_actions"]);
}

module.exports = { evaluate, buildMessages, callOpenAI };
