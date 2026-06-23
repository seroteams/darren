const fs = require("node:fs");
const path = require("node:path");

const { logStage } = require("./session");
const { promptFor } = require("./one-on-one-types");
const { splitSystemUser } = require("./prompt-utils");
const { FOCUS_POINTS_FILE } = require("../backend/engine/paths");

const FOCUS_POINTS_PATH = FOCUS_POINTS_FILE;

const CATALOGUE = JSON.parse(fs.readFileSync(FOCUS_POINTS_PATH, "utf8"));

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const { isRelationalArc } = require("./relational-arcs");
const { loadRoleProfile, renderRoleProfileBlock, roleProfileLogInfo } = require("./role-profile");
const getDefaultModel = () => modelFor("focus_points");

// Relational arcs (Bi-weekly check-in, Something feels off) must never surface a
// competency focus point — it reads as a hidden performance review. The model
// can't pick what it isn't given, so we drop competency entries from the menu it
// sees for these arcs. The trust gate (FOCUS_ARC_LEAK) stays as a backstop.
function catalogueForArc(catalogue, meetingType) {
  if (!isRelationalArc(meetingType)) return catalogue;
  return {
    focus_points: (catalogue.focus_points || []).filter((fp) => fp.category !== "competency"),
  };
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    meeting_type: { type: "string" },
    focus_points: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          reason: { type: "string" },
          source: { type: "string", enum: ["signal", "best_practice"] },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["id", "label", "reason", "source", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["meeting_type", "focus_points"],
  additionalProperties: false,
};

function loadFocusPoints() {
  return CATALOGUE;
}

function oneSentenceReason(text, maxWords = 22) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return trimmed;
  const first = trimmed.match(/^(.+?[.!?])(?:\s|$)/)?.[1] || trimmed.split(/\s*;\s*/)[0] || trimmed;
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return first;
  return `${words.slice(0, maxWords).join(" ").replace(/[,;:—–-]+$/, "")}.`;
}

function buildMessages({ name, role, seniority, meetingType, notes, focusPoints }) {
  const template = fs.readFileSync(promptFor(meetingType, "focusPoints"), "utf8");
  const filled = template
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{NAME}}", name || "(not provided)")
    .replaceAll("{{ROLE}}", role || "(not provided)")
    .replaceAll("{{SENIORITY}}", seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", meetingType)
    .replaceAll("{{MANAGER_NOTES}}", notes || "(none)")
    .replaceAll(
      "{{ROLE_PROFILE_BLOCK}}",
      renderRoleProfileBlock(loadRoleProfile({ role, seniority }), { slice: "focus", meetingType })
    );

  return splitSystemUser(filled);
}

async function callOpenAI({ system, user, model = getDefaultModel() }) {
  return callAI({
    system,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: "focus_points_selection",
    temperature: 0.5,
    model,
    costLabel: "01-focus-points",
  });
}

async function generateFocusPoints(
  inputs,
  { model = getDefaultModel(), session, stage = "01-focus-points" } = {}
) {
  const catalogue = loadFocusPoints();
  const offered = catalogueForArc(catalogue, inputs.meetingType);
  const messages = buildMessages({ ...inputs, focusPoints: offered });
  const raw = await callOpenAI({ ...messages, model });

  logStage(session, stage, {
    inputs: { ...inputs, model, roleProfile: roleProfileLogInfo(inputs) },
    prompt: messages.filled,
    response: raw,
  });

  const parsed = parseAIJson(raw, "Focus points model", ["meeting_type", "focus_points"]);

  const catalogueById = new Map(catalogue.focus_points.map((fp) => [fp.id, fp]));
  const items = Array.isArray(parsed.focus_points) ? parsed.focus_points : [];

  return {
    meeting_type: parsed.meeting_type || inputs.meetingType,
    focus_points: items.map((fp) => {
      const entry = catalogueById.get(fp.id);
      return {
        id: fp.id,
        type: entry ? entry.label : null,
        category: entry ? entry.category : null,
        label: fp.label,
        reason: oneSentenceReason(fp.reason),
        source: fp.source,
        confidence: fp.confidence || "low",
        known: !!entry,
      };
    }),
  };
}

module.exports = {
  generateFocusPoints,
  loadFocusPoints,
  buildMessages,
  callOpenAI,
};
