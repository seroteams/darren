const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

const { logStage } = require("./session");
const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const { promptFor } = require("./one-on-one-types");
const { withPromptVersion } = require("./prompt-version");
const { resolveSelectedFocus } = require("./selected-focus");
const { splitSystemUser } = require("./prompt-utils");

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
    confidence:      { type: "string" },
    dontAssume:      { type: "string" },
  },
  required: ["coreIssue", "openingQuestion", "listenFor", "avoid", "goodOutcome", "suggestedAction", "confidence", "dontAssume"],
  additionalProperties: false,
};

const GENERIC_OPENERS = [
  "how are you",
  "tell me about",
  "what do you think",
  "how's it going",
  "how have you been",
];

const ACCUSATORY_OPENER_PATTERNS = [
  { re: /what specific .+ have you\b/i, msg: "openingQuestion uses accusatory shape (What specific … have you)" },
  { re: /why haven't you\b/i, msg: "openingQuestion uses accusatory shape (Why haven't you)" },
  { re: /where have you fallen short\b/i, msg: "openingQuestion uses accusatory shape (fallen short)" },
  { re: /impact your transition\b/i, msg: "openingQuestion frames impact on transition as deficit" },
];

const OPENER_NEGATIVE_EVAL = /\b(challenges|issues|problems|weakness|deficit|fallen short|failing|suck|bad at)\b/i;
const OPENER_FORWARD_VERBS = /\b(want|land|stretch|move|build|thinking|toward|towards|forward|confidence|handle)\b/i;
const BIWEEKLY_HARD_EDGE =
  /\b(what specific|what's not working|where are you strugg|why haven't you|what problems|what issues have you|what's going wrong|what has gone wrong)\b/i;
const OPENER_PERFORMATIVE = /\b(the real version|honest version|no filter|real talk|level with me)\b/i;

const LISTENFOR_PARAPHRASE = /\b(acknowledges|has a plan to|has received)\b/i;
const LISTENFOR_BEHAVIORAL = /\b(deflects|pivots|names|avoids|mentions|redirects|interrupts|pauses|volunteers|describes|offers|signals|hesitates|concrete|specific|last week|this quarter|this sprint|stakeholder|project|meeting)\b/i;

const GOODOUTCOME_LEVEL_MARKERS =
  /\b(junior|mid|senior|expert|lead|staff|principal|director|vp|end-to-end|end to end|owns|ownership|scope|decision authority|leading|lead-level|lead level)\b/i;

const POST_MEETING_ACTION =
  /\b(schedule|set up a follow|follow-up meeting|follow up meeting|next month|next quarter|in one month|review progress)\b/i;
const PRE_IN_MEETING_ACTION = /^(before the 1:1|during the 1:1|before the meeting|during the meeting)\b/i;

function focusPointLabels(focusPoints) {
  return (focusPoints || [])
    .map((fp) => (fp.label || fp.type || "").toLowerCase())
    .filter(Boolean);
}

function buildMessages({
  name,
  roleTitle,
  seniority,
  meetingType,
  observedShift,
  focusPoints,
  selectedFocus,
}) {
  const template = fs.readFileSync(promptFor(meetingType, "preparation"), "utf8");
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes: observedShift, observedShift, focusPoints });
  const filled = template
    .replaceAll("{{NAME}}", name || "(not provided)")
    .replaceAll("{{ROLE_TITLE}}", roleTitle || "(not provided)")
    .replaceAll("{{SENIORITY}}", seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", meetingType || "(not provided)")
    .replaceAll("{{OBSERVED_SHIFT}}", observedShift || "(none)")
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints || [], null, 2))
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{PRIMARY_FOCUS_ID}}", sf?.id || "(none)");

  return splitSystemUser(filled);
}

function validateBrief(brief, inputs) {
  const issues = [];
  const opener = (brief.openingQuestion || "").trim();
  const openerLower = opener.toLowerCase();
  const meetingType = (inputs.meetingType || "").toLowerCase();
  const isGrowth = meetingType.includes("growth");
  const isBiweekly = /bi[- ]?weekly|check-?in/.test(meetingType);

  // C1 — non-accusatory opening
  for (const { re, msg } of ACCUSATORY_OPENER_PATTERNS) {
    if (re.test(opener)) issues.push(msg);
  }
  for (const word of ["fallen short", "failing", "weakness"]) {
    if (openerLower.includes(word)) {
      issues.push(`openingQuestion contains banned word "${word}"`);
    }
  }

  // C2 — private concern reframe (no negative-evaluation nouns; prefer forward framing)
  if (OPENER_NEGATIVE_EVAL.test(opener)) {
    issues.push("openingQuestion uses negative-evaluation noun (issues/challenges/problems/weakness) — reframe into coaching language");
  }
  if (isGrowth && opener.length > 10 && !OPENER_FORWARD_VERBS.test(opener)) {
    issues.push("openingQuestion may lack forward developmental framing for Growth & career plan");
  }
  if (isBiweekly && BIWEEKLY_HARD_EDGE.test(opener)) {
    issues.push("openingQuestion is too hard-edged for a bi-weekly check-in — open with pace or bandwidth first");
  }
  if (OPENER_PERFORMATIVE.test(openerLower)) {
    issues.push("openingQuestion uses performative intimacy phrasing — use plain manager language");
  }
  const fpLabels = focusPointLabels(inputs.focusPoints);
  for (const label of fpLabels) {
    const snippet = label.slice(0, 24);
    if (snippet.length >= 12 && openerLower.includes(snippet)) {
      issues.push("openingQuestion may reuse a focus-point label verbatim");
      break;
    }
  }

  // C3 — listenFor behavioural tells
  for (const item of brief.listenFor || []) {
    const t = String(item);
    if (LISTENFOR_PARAPHRASE.test(t)) {
      issues.push(`listenFor paraphrases focus instead of behavioural tell: "${t.slice(0, 60)}…"`);
    } else if (!LISTENFOR_BEHAVIORAL.test(t)) {
      issues.push(`listenFor may lack observable behavioural cue: "${t.slice(0, 60)}…"`);
    }
  }

  // C4 — goodOutcome level-specific
  const outcome = (brief.goodOutcome || "").toLowerCase();
  const seniorityLower = (inputs.seniority || "").toLowerCase();
  const roleLower = (inputs.roleTitle || "").toLowerCase();
  const hasLevelSignal =
    GOODOUTCOME_LEVEL_MARKERS.test(outcome) ||
    (seniorityLower && outcome.includes(seniorityLower)) ||
    roleWordsFromTitle(roleLower).some((w) => outcome.includes(w));
  if (!hasLevelSignal) {
    issues.push("goodOutcome may be too generic — add seniority, role, or level-specific artefact (lead scope, ownership, etc.)");
  }

  // C5 — suggestedAction pre/in-meeting only
  const action = (brief.suggestedAction || "").trim();
  const actionLower = action.toLowerCase();
  if (POST_MEETING_ACTION.test(actionLower)) {
    issues.push("suggestedAction schedules post-meeting follow-up — use Before/During the 1:1 only");
  }
  if (action.length > 5 && !PRE_IN_MEETING_ACTION.test(actionLower) && !/^(ask|agree|pick|name|surface|offer|invite|explore)\b/i.test(action)) {
    issues.push('suggestedAction should start with "Before the 1:1" or "During the 1:1" (or equivalent in-meeting imperative)');
  }

  // Role awareness — coreIssue must mention something role/seniority-specific
  const roleWords = roleWordsFromTitle((inputs.roleTitle || "").toLowerCase());
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
    "growth": ["growth", "career", "development", "trajectory", "next", "goal", "lead"],
    "off": ["concern", "feeling", "tension", "shift", "off", "struggling", "issue", "friction"],
  };
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

  if (!action || action.split(/\s+/).length < 5) {
    issues.push("suggestedAction is missing or too short");
  }

  // Evidence honesty — confidence must name its level and basis; dontAssume
  // must be a real sentence, not filler.
  const confidence = (brief.confidence || "").trim();
  if (!/^(low|medium|high)\b/i.test(confidence)) {
    issues.push('confidence must start with "Low", "Medium", or "High"');
  } else if (confidence.split(/\s+/).length < 4) {
    issues.push("confidence must name what the level rests on (e.g. \"Medium — based on your note and her seniority\")");
  }
  const dontAssume = (brief.dontAssume || "").trim();
  if (dontAssume.split(/\s+/).filter(Boolean).length < 4) {
    issues.push("dontAssume is missing or too short — name the one thing the data does not yet support");
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

function roleWordsFromTitle(roleLower) {
  return roleLower.split(/\s+/).filter((w) => w.length > 3);
}

async function generatePreparation(
  inputs,
  { model = getDefaultModel(), session } = {}
) {
  const runId = randomUUID();

  const focusPoints = inputs.focusPoints || [];
  const selectedFocus =
    inputs.selectedFocus ||
    resolveSelectedFocus({
      notes: inputs.notes || inputs.observedShift,
      observedShift: inputs.notes || inputs.observedShift,
      focusPoints,
      primaryFocusId: inputs.primaryFocusId,
    });
  const prepInput = {
    name: inputs.name,
    roleTitle: inputs.role || inputs.roleTitle,
    seniority: inputs.seniority,
    meetingType: inputs.meetingType,
    observedShift: inputs.notes || inputs.observedShift || "",
    focusPoints,
    selectedFocus,
    primaryFocusId: selectedFocus?.id,
  };

  const messages = buildMessages(prepInput);

  let raw = await callAI({
    system:     messages.system,
    user:       messages.user,
    schema:     RESPONSE_SCHEMA,
    schemaName: "manager_preparation",
    temperature: 0.6,
    model,
    costLabel:  "01b-preparation",
  });

  let parsed = parseAIJson(raw, "Preparation model", ["coreIssue", "openingQuestion"]);
  let validation = validateBrief(parsed, prepInput);
  let attempts = 1;

  if (!validation.passed) {
    const retryUser = messages.user +
      "\n\n---\n\n**Validation failed on prior attempt. Fix these issues before returning JSON:**\n- " +
      validation.issues.join("\n- ");

    const retryRaw = await callAI({
      system:     messages.system,
      user:       retryUser,
      schema:     RESPONSE_SCHEMA,
      schemaName: "manager_preparation",
      temperature: 0.6,
      model,
      costLabel:  "01b-preparation-retry",
    });
    const retryParsed = parseAIJson(retryRaw, "Preparation model (retry)", ["coreIssue", "openingQuestion"]);
    const retryValidation = validateBrief(retryParsed, prepInput);
    attempts = 2;

    if (retryValidation.passed || retryValidation.issues.length < validation.issues.length) {
      raw = retryRaw;
      parsed = retryParsed;
      validation = retryValidation;
    }
  }

  const prepPromptPath = promptFor(prepInput.meetingType, "preparation");

  logStage(session, "01b-preparation", {
    inputs: withPromptVersion(
      { ...prepInput, model, runId, validation, attempts },
      prepPromptPath
    ),
    prompt: messages.filled,
    response: raw,
  });

  return { brief: parsed, runId, validation, attempts };
}

module.exports = { generatePreparation, buildMessages, validateBrief };
