const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const { logStage } = require("./session");
const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");

const ROOT = path.join(__dirname, "..");
const PROMPT_PATH = path.join(ROOT, "prompts", "preparation.md");

const getDefaultModel = () => modelFor("preparation");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    coreIssue:       { type: "string" },
    openingQuestion: { type: "string" },
    listenFor:       { type: "array", items: { type: "string" }, maxItems: 3 },
    avoid:           { type: "array", items: { type: "string" }, maxItems: 2 },
    goodOutcome:     { type: "string" },
    suggestedAction: { type: "string" },
  },
  required: ["coreIssue", "openingQuestion", "listenFor", "avoid", "goodOutcome", "suggestedAction"],
  additionalProperties: false,
};

const GENERIC_OPENERS = [
  "how are you",
  "tell me about",
  "what do you think",
  "how's it going",
  "how have you been",
];

function buildMessages({ name, roleTitle, seniority, meetingType, observedShift, focusPoints }) {
  const template = fs.readFileSync(PROMPT_PATH, "utf8");
  const filled = template
    .replace("{{NAME}}", name || "(not provided)")
    .replace("{{ROLE_TITLE}}", roleTitle || "(not provided)")
    .replace("{{SENIORITY}}", seniority || "(not provided)")
    .replace("{{MEETING_TYPE}}", meetingType || "(not provided)")
    .replace("{{OBSERVED_SHIFT}}", observedShift || "(none)")
    .replace("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints || [], null, 2));

  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch   = filled.match(/## User\s+([\s\S]*)$/);
  return {
    filled,
    system: systemMatch ? systemMatch[1].trim() : "",
    user:   userMatch   ? userMatch[1].trim()   : filled,
  };
}

function validateBrief(brief, inputs) {
  const issues = [];

  // Role awareness — coreIssue must mention something role/seniority-specific
  const roleWords = (inputs.roleTitle || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const seniorityWords = ["junior", "mid", "senior", "lead", "staff", "principal", "manager", "director", "vp"];
  const coreIssueLower = (brief.coreIssue || "").toLowerCase();
  const hasRoleRef = roleWords.some(w => coreIssueLower.includes(w)) ||
    seniorityWords.some(w => coreIssueLower.includes(w));
  if (!hasRoleRef) {
    issues.push("coreIssue does not reference role or seniority — may be too generic");
  }

  // Meeting-type awareness
  const meetingWords = {
    "check": ["check", "routine", "regular", "cadence", "weekly", "bi-weekly", "biweekly"],
    "performance": ["performance", "feedback", "review", "rating", "expectation"],
    "growth": ["growth", "career", "development", "trajectory", "next", "goal"],
    "off": ["concern", "feeling", "tension", "shift", "off", "struggling", "issue", "friction"],
  };
  const meetingType = (inputs.meetingType || "").toLowerCase();
  const relevantWords = Object.entries(meetingWords).find(([k]) => meetingType.includes(k))?.[1] || [];
  const allText = coreIssueLower + " " + (brief.openingQuestion || "").toLowerCase();
  if (relevantWords.length && !relevantWords.some(w => allText.includes(w))) {
    issues.push("output may not reflect the meeting type distinctly");
  }

  // Weak opening question
  const qLower = (brief.openingQuestion || "").toLowerCase();
  if (GENERIC_OPENERS.some(phrase => qLower.startsWith(phrase))) {
    issues.push("openingQuestion appears generic — should be specific to the selected concerns");
  }
  if (!brief.openingQuestion || brief.openingQuestion.trim().length < 10) {
    issues.push("openingQuestion is too short or empty");
  }

  // Length checks
  const coreWordCount = (brief.coreIssue || "").split(/\s+/).filter(Boolean).length;
  if (coreWordCount > 80) {
    issues.push(`coreIssue is too long (${coreWordCount} words — max 80)`);
  }
  if ((brief.listenFor || []).length > 3) {
    issues.push("listenFor has more than 3 items");
  }
  if ((brief.avoid || []).length > 2) {
    issues.push("avoid has more than 2 items");
  }

  // No next action
  const action = (brief.suggestedAction || "").trim();
  if (!action || action.split(/\s+/).length < 5) {
    issues.push("suggestedAction is missing or too short");
  }

  // Unsafe interpretation — word-boundary checks with negative lookaheads for common safe-use phrases
  const CLINICAL_PATTERNS = [
    /\bmental health\b(?!\s+(?:awareness|training|support|resources|first.aid|check.in|conversation))/i,
    /\b(?:anxiety|depression|burnout)\b(?!\s+(?:risk|prevention|workload|management|strategies|support|about))/i,
    /\bpsychological\b(?!\s+safety)/i,
    /\b(?:diagnosis|disorder)\b/i,
  ];
  const fullText = Object.values(brief).flat().join(" ");
  if (CLINICAL_PATTERNS.some((p) => p.test(fullText))) {
    issues.push("output may contain unsafe clinical interpretation — review before use");
  }

  return { passed: issues.length === 0, issues };
}

async function generatePreparation(
  inputs,
  { model = getDefaultModel(), session } = {}
) {
  const runId = randomUUID();

  const prepInput = {
    name:             inputs.name,
    roleTitle:        inputs.role || inputs.roleTitle,
    seniority:        inputs.seniority,
    meetingType:      inputs.meetingType,
    observedShift:    inputs.notes || inputs.observedShift || "",
    focusPoints:      inputs.focusPoints || [],
  };

  const messages = buildMessages(prepInput);

  const raw = await callAI({
    system:     messages.system,
    user:       messages.user,
    schema:     RESPONSE_SCHEMA,
    schemaName: "manager_preparation",
    temperature: 0.6,
    model,
    costLabel:  "01b-preparation",
  });

  const parsed = parseAIJson(raw, "Preparation model", ["coreIssue", "openingQuestion"]);

  const validation = validateBrief(parsed, prepInput);

  logStage(session, "01b-preparation", {
    inputs: { ...prepInput, model, runId, validation },
    prompt: messages.filled,
    response: raw,
  });

  return { brief: parsed, runId, validation };
}

module.exports = { generatePreparation };
