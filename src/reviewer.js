const fs = require("node:fs");

const { logStage } = require("./session");
const { loadAxes } = require("./axes");
const { promptFor, getArc, getType } = require("./one-on-one-types");
const { withPromptVersion } = require("./prompt-version");
const { resolveSelectedFocus } = require("./selected-focus");

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

function tokenCount(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

// Fixed agenda openers. These are self-read intros, not signal probes — they
// only count toward read-quality when they carry real signal (see below).
const INTRO_ALIASES = new Set([
  "q_open_anything_to_cover",
  "q_intro_agenda_check",
]);

// Tight, multi-word decline / agenda-neutral phrases, matched as normalized
// substrings. Each is distinctive enough not to fire on real signal — never a
// bare "nothing" ("nothing has improved" is a real answer, not a decline).
const DECLINE_PHRASES = [
  "nothing to add",
  "nothing extra",
  "nothing specific",
  "nothing else",
  "nothing on my end",
  "nothing from me",
  "no nothing",
  "okay to start",
  "fine to start",
  "happy to start",
];

// Normalize a note before phrase-matching: lowercase, drop punctuation, collapse
// whitespace. Keeps matching safe and exact-ish rather than broad.
function normalizeAnswer(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDecline(answer) {
  const norm = normalizeAnswer(answer);
  if (!norm) return false;
  return DECLINE_PHRASES.some((p) => norm.includes(p));
}

// Precompute the read-quality gate the evaluation prompt consumes, so the
// determination does not depend on a weak model reasoning it out at generation
// time. Mirrors <read_quality_gate> in prompts/final-evaluation.md.
//
// The transcript answer field holds the MANAGER's shorthand note of the report's
// reply — third-person, terse, fragment-OK. That is the expected, primary signal,
// NOT a sign of a thin read. A turn carries no signal when it is a skip, an empty
// jot, a ≤2-token non-answer ("fine", "ok"), or a decline ("nothing to add").
//
// Arc-awareness: a self-read / agenda-opener turn is excluded from the tally
// ONLY when it carries no signal — it is an opener, not a probe. If the opener
// holds real signal (a named concern, blocker, workload, risk, growth intent) it
// counts like any substantive turn. Non-intro turns always count.
function computeReadQuality(transcript) {
  const turns = (transcript || []).map((t, i) => {
    const answer = typeof t === "string" ? t : t?.answer || "";
    const alias = t?.alias || null;
    const stage = t?.stage || null;
    const skipped = t?.skipped === true;
    const empty = answer.trim().length === 0;
    const tooShort = tokenCount(answer) <= 2;
    const decline = isDecline(answer);
    // A skip or empty jot is a *refusal* — the manager captured no note (no
    // data). A two-token answer or a decline is a *thin* note (weak data). Both
    // carry no real signal, but they are different failures: the first must not
    // be framed as "the report answered in 2-4 words".
    let reason = null;
    if (skipped || empty) reason = "skip";
    else if (decline) reason = "decline";
    else if (tooShort) reason = "thin";
    const shallow = reason !== null;
    const is_note = !shallow;
    const isIntro = stage === "self_read" || INTRO_ALIASES.has(alias);
    const counted = !(isIntro && shallow);
    return { index: i + 1, alias, stage, reason, is_note, shallow, counted };
  });
  const counted = turns.filter((t) => t.counted);
  const total_turns = counted.length;
  const skipped_count = counted.filter((t) => t.reason === "skip").length;
  const thin_count = counted.filter((t) => t.reason === "thin" || t.reason === "decline").length;
  const shallow_count = skipped_count + thin_count;
  const note_turns = counted.filter((t) => t.is_note).length;
  const shallow_ratio = total_turns
    ? Number((shallow_count / total_turns).toFixed(2))
    : 0;
  // Trigger on thin *coverage* (too few real notes), not on raw shallow count —
  // so a few refused questions in an otherwise well-answered session does not
  // flip the briefing into partial-read mode.
  const partial_read =
    note_turns < 3 || (total_turns > 0 && note_turns / total_turns < 0.6);
  let partial_reason = null;
  if (partial_read) {
    partial_reason = skipped_count >= thin_count ? "mostly_skipped" : "mostly_thin";
  }
  return {
    note_turns,
    total_turns,
    skipped_count,
    thin_count,
    shallow_count,
    shallow_ratio,
    partial_read,
    partial_reason,
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

function applyAxisConfidence(briefing, axisState, transcript) {
  if (!briefing?.axes) return briefing;
  const answers = transcriptText(transcript);
  const hasWellbeingEvidence = WELLBEING_TRANSCRIPT_EVIDENCE.test(answers);
  const learning = transcriptShowsLearningCommitment(transcript);

  for (const ax of briefing.axes) {
    const stateScore = axisState?.[ax.id]?.score;
    const history = axisState?.[ax.id]?.history;
    const magnitude = Math.abs(typeof stateScore === "number" ? stateScore : ax.score);

    // Explicit read-status — the backend decides, the UI renders it. An axis is
    // "not_read" when nothing in the meeting moved it (no_history), it landed at a
    // measured zero (zero_score), or it was scored on inference without supporting
    // signal (insufficient_signal). The UI collapses on this, not on a magic 0.
    const noHistory = !Array.isArray(history) || history.length === 0;
    const zeroScore = stateScore === 0;
    let read_status = "read";
    let not_read_reason;
    if (noHistory) {
      read_status = "not_read";
      not_read_reason = "no_history";
    } else if (zeroScore) {
      read_status = "not_read";
      not_read_reason = "zero_score";
    } else if (ax.id === "wellbeing" && !hasWellbeingEvidence && magnitude <= 1) {
      read_status = "not_read";
      not_read_reason = "insufficient_signal";
    }

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
    }

    if (ax.id === "growth" && learning) {
      if (confidence === "low") confidence = "medium";
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

    // A not_read axis carries no finding — replace any inferred meaning with a
    // plain "didn't come up" caption so it never reads as a verdict.
    if (read_status === "not_read") {
      ax.meaning = "This didn't come up in the conversation — not enough signal to read.";
      confidence = "low";
      evidence_basis = "axis_state_only";
    }

    ax.read_status = read_status;
    if (not_read_reason) ax.not_read_reason = not_read_reason;
    ax.confidence = confidence;
    ax.evidence_basis = evidence_basis;
  }
  return briefing;
}

function applyManagerBriefingPostProcess(briefing, axisState, transcript) {
  let b = briefing;
  b = applyAxisScoresFromState(b, axisState);
  b = applyAxisConfidence(b, axisState, transcript);
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
      JSON.stringify(computeReadQuality(transcript), null, 2)
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

// Checks that the briefing kept two promises the prompt makes but nothing
// previously verified: (1) a present agenda carry-forward is acknowledged in
// exactly one place; (2) a partial read includes a next_action about
// re-running/extending the conversation. Warn-don't-reject in production
// (mirrors validateBriefingOverlap); the offline test hard-fails on these.
const PARTIAL_READ_RERUN =
  /\b(re-?ask|re-?run|rerun|revisit|extend|another (conversation|session)|follow up)\b/i;

function validateBriefingPromptRules(briefing, { agenda, readQuality } = {}) {
  const issues = [];

  const summary = agenda?.summary;
  if (summary) {
    const agendaWords = new Set(normalizeContentWords(summary));
    const entries = [
      ...(Array.isArray(briefing?.summary_bullets) ? briefing.summary_bullets : []),
      ...(Array.isArray(briefing?.next_actions)
        ? briefing.next_actions.map((a) => a?.action)
        : []),
    ];
    const hits = entries.filter((entry) => {
      const words = normalizeContentWords(entry);
      let shared = 0;
      for (const w of words) if (agendaWords.has(w)) shared += 1;
      return shared >= 2;
    }).length;
    if (hits === 0) {
      issues.push("agenda carry-forward present but not acknowledged in summary_bullets or next_actions");
    } else if (hits > 1) {
      issues.push(`agenda carry-forward acknowledged in ${hits} places (rule says exactly one)`);
    }
  }

  if (readQuality?.partial_read) {
    const actions = Array.isArray(briefing?.next_actions) ? briefing.next_actions : [];
    const hasRerun = actions.some((a) => PARTIAL_READ_RERUN.test(a?.action || ""));
    if (!hasRerun) {
      issues.push("partial_read=true but no next_action addresses re-running the conversation");
    }
  }

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
    console.warn(`[evaluator] briefing overlap check: ${validation.issues.join("; ")}`);
  }

  const ruleCheck = validateBriefingPromptRules(briefing, {
    agenda,
    readQuality: computeReadQuality(transcript),
  });
  if (!ruleCheck.passed) {
    console.warn(`[evaluator] briefing rule check: ${ruleCheck.issues.join("; ")}`);
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
  clampScore,
  computeReadQuality,
  validateBriefingPromptRules,
};
