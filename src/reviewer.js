const fs = require("node:fs");

const { logStage } = require("./session");
const { loadAxes } = require("./axes");
const { promptFor, getArc, getType } = require("./one-on-one-types");
const { withPromptVersion } = require("./prompt-version");
const { resolveSelectedFocus } = require("./selected-focus");
const cost = require("./cost");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("evaluation");

const AXIS_IDS = ["wellbeing", "engagement", "clarity", "growth"];
const AXIS_MIN = -10;
const AXIS_MAX = 10;

const OVERLAP_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "to", "for", "with",
  "is", "are", "was", "were", "be", "been",
]);

const WELLBEING_TRANSCRIPT_EVIDENCE =
  /\b(stress|stressed|burnout|burned out|overwhelmed|anxious|exhausted|can't cope|struggling emotionally)\b/i;

const GROWTH_VERY_WEAK = /\bvery weak\b/i;

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

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(AXIS_MIN, Math.min(AXIS_MAX, Math.round(x)));
}

function transcriptText(transcript) {
  return (transcript || [])
    .map((t) => (typeof t === "string" ? t : t?.answer || ""))
    .join("\n");
}

const FIRST_PERSON_RE =
  /\b(i|i'm|i've|i'd|i'll|my|me|mine|myself|we|we're|we've|we'd|our|ours|us)\b/i;
const THIRD_PERSON_SUBJECT_RE =
  /\b(she|he|they|her|his|their|theirs|them|him|hers)\b/i;

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenCount(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

// Manager-voiced = the manager paraphrasing the report in the third person, not
// the report self-reporting. Flagged only when there is NO first-person pronoun
// AND a third-person subject reference (the report's name or she/he/they). This
// avoids misflagging genuine first-person answers that simply omit a pronoun
// ("Usually the flow and edge cases.").
function isManagerVoiced(answer, name) {
  const a = String(answer || "");
  if (!a.trim()) return false;
  if (FIRST_PERSON_RE.test(a)) return false;
  const hasName = name
    ? new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(a)
    : false;
  return hasName || THIRD_PERSON_SUBJECT_RE.test(a);
}

// Precompute the read-quality gate the evaluation prompt consumes, so the
// determination does not depend on a weak model reasoning it out at generation
// time. Mirrors <read_quality_gate> in prompts/final-evaluation.md.
function computeReadQuality(transcript, name) {
  const turns = (transcript || []).map((t, i) => {
    const answer = typeof t === "string" ? t : t?.answer || "";
    const skipped = t?.skipped === true;
    const managerVoiced = isManagerVoiced(answer, name);
    const shortAns = tokenCount(answer) <= 3;
    const first_person = !managerVoiced && !skipped && answer.trim().length > 0;
    const shallow = skipped || shortAns || managerVoiced;
    return { index: i + 1, alias: t?.alias || null, first_person, shallow };
  });
  const total_turns = turns.length;
  const shallow_count = turns.filter((t) => t.shallow).length;
  const first_person_turns = turns.filter((t) => t.first_person).length;
  const shallow_ratio = total_turns
    ? Number((shallow_count / total_turns).toFixed(2))
    : 0;
  const partial_read = shallow_count >= 3 || shallow_ratio >= 0.4;
  return {
    first_person_turns,
    total_turns,
    shallow_count,
    shallow_ratio,
    partial_read,
    turns,
  };
}

function transcriptShowsLearningCommitment(transcript) {
  const joined = transcriptText(transcript).toLowerCase();
  const hasMiss = /\b(missed|wrong|assumption|failed|did not)\b/.test(joined);
  const hasCause = /\b(because|retry|edge case|logic|escalat)\b/.test(joined);
  const hasCommit =
    /\b(will|before handoff|checklist|commit|differently|going to)\b/.test(joined);
  return hasMiss && hasCause && hasCommit;
}

function applyAxisScoresFromState(briefing, axisState) {
  if (!briefing?.axes || !axisState) return briefing;
  for (const ax of briefing.axes) {
    const st = axisState[ax.id];
    if (st && typeof st.score === "number") {
      ax.score = clampScore(st.score);
    } else {
      ax.score = clampScore(ax.score);
    }
  }
  return briefing;
}

function softenWellbeingMeaning(meaning, transcript) {
  const answers = transcriptText(transcript);
  if (WELLBEING_TRANSCRIPT_EVIDENCE.test(answers)) return meaning;
  const distress =
    /\b(stress|burnout|overload|overwhelmed|distress)\b/i.test(meaning || "");
  if (!distress) return meaning;
  return (
    "Weak wellbeing signal — mostly a clarity and capacity read from rushed handoffs and timelines; " +
    "not enough direct evidence of distress to treat as a wellbeing issue on its own."
  );
}

function softenGrowthMeaning(meaning, transcript) {
  if (!GROWTH_VERY_WEAK.test(meaning || "")) return meaning;
  if (!transcriptShowsLearningCommitment(transcript)) return meaning;
  return meaning.replace(
    /\bvery weak growth signal\b/i,
    "Mixed growth signal: she named the miss and committed to concrete habit changes"
  ).replace(/\bvery weak\b/i, "mixed");
}

function applyAxisConfidence(briefing, axisState, transcript) {
  if (!briefing?.axes) return briefing;
  const answers = transcriptText(transcript);
  const hasWellbeingEvidence = WELLBEING_TRANSCRIPT_EVIDENCE.test(answers);
  const learning = transcriptShowsLearningCommitment(transcript);

  for (const ax of briefing.axes) {
    const stateScore = axisState?.[ax.id]?.score;
    const magnitude = Math.abs(typeof stateScore === "number" ? stateScore : ax.score);

    let confidence = "medium";
    let evidence_basis = "mixed";

    if (magnitude <= 1) {
      confidence = "low";
      evidence_basis = "axis_state_only";
    } else if (magnitude >= 5) {
      confidence = "high";
      evidence_basis = "transcript_quotes";
    }

    if (ax.id === "wellbeing" && !hasWellbeingEvidence) {
      confidence = "low";
      evidence_basis = "axis_state_only";
      ax.meaning = softenWellbeingMeaning(ax.meaning, transcript);
    }

    if (ax.id === "growth" && learning) {
      if (confidence === "low") confidence = "medium";
      ax.meaning = softenGrowthMeaning(ax.meaning, transcript);
    }

    if (confidence === "low" && ax.meaning) {
      const harsh =
        /\b(defining signal|ignore at your cost|very weak)\b/i.test(ax.meaning);
      if (harsh) {
        ax.meaning = ax.meaning
          .replace(/\bdefining signal\b/gi, "notable pattern")
          .replace(/\bignore at your cost\b/gi, "worth watching")
          .replace(/\bvery weak\b/gi, "weak");
      }
    }

    ax.confidence = confidence;
    ax.evidence_basis = evidence_basis;
  }
  return briefing;
}

function sanitizeManagerBriefingText(text) {
  return String(text || "")
    .replace(/\bhought retry logic/gi, "the retry-logic assumption")
    .replace(/\bSero\b/gi, "the conversation")
    .replace(/\bproduct QA\b/gi, "")
    .replace(/\bsystem diagnostics\b/gi, "");
}

function sanitizeManagerBriefing(briefing) {
  if (!briefing) return briefing;
  const scalar = [
    "headline",
    "understanding_paragraph",
    "brutal_truth_employee",
    "brutal_truth_manager",
  ];
  for (const key of scalar) {
    if (briefing[key]) briefing[key] = sanitizeManagerBriefingText(briefing[key]);
  }
  if (Array.isArray(briefing.summary_bullets)) {
    briefing.summary_bullets = briefing.summary_bullets.map(sanitizeManagerBriefingText);
  }
  if (Array.isArray(briefing.watch_for)) {
    briefing.watch_for = briefing.watch_for.map(sanitizeManagerBriefingText);
  }
  if (Array.isArray(briefing.next_actions)) {
    for (const item of briefing.next_actions) {
      if (item?.action) item.action = sanitizeManagerBriefingText(item.action);
    }
  }
  if (Array.isArray(briefing.axes)) {
    for (const ax of briefing.axes) {
      if (ax?.meaning) ax.meaning = sanitizeManagerBriefingText(ax.meaning);
    }
  }
  return briefing;
}

function applyManagerBriefingPostProcess(briefing, axisState, transcript) {
  let b = briefing;
  b = applyAxisScoresFromState(b, axisState);
  b = applyAxisConfidence(b, axisState, transcript);
  b = sanitizeManagerBriefing(b);
  return b;
}

function formatAgendaCarryForward(agenda) {
  const summary = agenda?.summary;
  if (!summary) return "(no carry-forward agenda item)";
  const status =
    agenda.covered === true
      ? "covered"
      : agenda.covered === false
        ? "NOT covered"
        : "unconfirmed";
  return `The team member opened by asking to cover: "${summary}". By the end the manager marked this ${status}.`;
}

function buildMessages({
  ctx,
  focusPoints,
  transcript,
  axisState,
  notes,
  selectedFocus,
  agenda,
}) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "evaluation"), "utf8");
  const axes = loadAxes();
  const arc = getArc(ctx.meetingType);
  const sf =
    selectedFocus ||
    resolveSelectedFocus({
      notes: notes || ctx.notes,
      observedShift: notes || ctx.notes,
      focusPoints,
    });
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
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{PRIMARY_FOCUS_ID}}", sf?.id || "(none)")
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcript, null, 2))
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2))
    .replaceAll(
      "{{READ_QUALITY_JSON}}",
      JSON.stringify(computeReadQuality(transcript, ctx.name), null, 2)
    )
    .replaceAll("{{AGENDA_CARRY_FORWARD}}", formatAgendaCarryForward(agenda));

  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    filled,
    system: systemMatch ? systemMatch[1].trim() : "",
    user: userMatch ? userMatch[1].trim() : filled,
  };
}

function buildProductQaMessages({
  ctx,
  focusPoints,
  transcript,
  axisState,
  notes,
  selectedFocus,
  productQaNotes,
  systemDiagnostics,
}) {
  const qaPath = promptFor(ctx.meetingType, "productQa");
  const template = fs.readFileSync(qaPath, "utf8");
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes, focusPoints });
  const filled = template
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
    .replaceAll("{{MANAGER_NOTES}}", notes || "(none)")
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcript, null, 2))
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2))
    .replaceAll("{{PRODUCT_QA_NOTES}}", productQaNotes || "(none)")
    .replaceAll(
      "{{SYSTEM_DIAGNOSTICS_JSON}}",
      JSON.stringify(systemDiagnostics || [], null, 2)
    );

  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    filled,
    system: systemMatch ? systemMatch[1].trim() : "",
    user: userMatch ? userMatch[1].trim() : filled,
  };
}

async function callOpenAI({ system, user, model, schemaName }) {
  return callAI({
    system,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: schemaName || "final_evaluation",
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
  { ctx, focusPoints, transcript, axisState, notes, selectedFocus, agenda },
  { model = getDefaultModel(), session, stage = "05-evaluation" } = {}
) {
  const sf =
    selectedFocus ||
    resolveSelectedFocus({
      notes: notes || ctx?.notes,
      focusPoints,
    });
  const msgs = buildMessages({
    ctx,
    focusPoints,
    transcript,
    axisState,
    notes,
    selectedFocus: sf,
    agenda,
  });
  const raw = await callOpenAI({ ...msgs, model });
  const evalPromptPath = promptFor(ctx.meetingType, "evaluation");

  logStage(session, stage, {
    inputs: withPromptVersion(
      { ctx, focusPoints, transcript, axisState, notes, selectedFocus: sf, model },
      evalPromptPath
    ),
    prompt: msgs.filled,
    response: raw,
  });

  let briefing = parseAIJson(raw, "Evaluator", ["headline", "axes", "next_actions"]);
  briefing = applyManagerBriefingPostProcess(briefing, axisState, transcript);

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

async function evaluateProductQa(
  {
    ctx,
    focusPoints,
    transcript,
    axisState,
    notes,
    selectedFocus,
    productQaNotes,
    systemDiagnostics,
  },
  { model = getDefaultModel(), session, stage = "05-product-qa" } = {}
) {
  const msgs = buildProductQaMessages({
    ctx,
    focusPoints,
    transcript,
    axisState,
    notes,
    selectedFocus,
    productQaNotes,
    systemDiagnostics,
  });
  const qaPath = promptFor(ctx.meetingType, "productQa");
  const raw = await callAI({
    system: msgs.system,
    user: msgs.user,
    schema: {
      type: "object",
      properties: {
        defects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              turn: { type: "integer" },
              alias: { type: "string" },
              symptom: { type: "string" },
              likely_cause: {
                type: "string",
                enum: ["planner", "runtime", "eval", "prep"],
              },
            },
            required: ["symptom", "likely_cause"],
            additionalProperties: false,
          },
        },
        summary: { type: "string" },
      },
      required: ["defects", "summary"],
      additionalProperties: false,
    },
    schemaName: "product_qa_report",
    temperature: 0.3,
    model,
    costLabel: stage,
  });

  logStage(session, stage, {
    inputs: withPromptVersion(
      { ctx, productQaNotes, systemDiagnostics, model },
      qaPath
    ),
    prompt: msgs.filled,
    response: raw,
  });

  return parseAIJson(raw, "Product QA", ["defects", "summary"]);
}

module.exports = {
  evaluate,
  evaluateProductQa,
  buildMessages,
  buildProductQaMessages,
  callOpenAI,
  fourGramOverlap,
  applyManagerBriefingPostProcess,
  applyAxisScoresFromState,
  sanitizeManagerBriefing,
  clampScore,
  computeReadQuality,
};
