const fs = require("node:fs");

const { loadAxes, validateAxisState, AXIS_IDS } = require("./axes");
const { newAlias, saveQuestion, listAllAliases, loadDir } = require("./questions");
const { getArc } = require("./meeting-arcs");
const { isRelationalArc } = require("./relational-arcs");
const { promptFor } = require("./one-on-one-types");
const { resolveSelectedFocus } = require("./selected-focus");
const { splitSystemUser } = require("./prompt-utils");
const { loadRoleProfile, renderRoleProfileBlock } = require("./role-profile");

const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const getDefaultModel = () => modelFor("planner");

const ALLOWED_DELTAS = [-3, -1, 0, 1, 3];
const MAX_QUEUE = 12;

// Questions minted at runtime (planner items, thread-follows) are run records,
// not bank material. They save under questions/_runtime/ so no later session
// can load them as candidates — a designer session once served another
// scenario's "retry logic" follow-up straight from the pool root (Jun 02-04).
const RUNTIME_SUBDIR = "_runtime";

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
    // ≤10-word verbatim quote from the note/transcript that establishes the
    // question's premise, or the literal "open" for premise-free questions.
    // Verified in reconcileQueue against the session's grounding corpus.
    grounding: { type: "string" },
  },
  required: ["ref_alias", "label", "name", "description", "purpose", "stage", "axis_effects", "grounding"],
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

function isPlannerOriginated(source) {
  return source === "planner_added" || (typeof source === "string" && source.startsWith("reworded_from:"));
}

function isSameStagePlannerDrill(question, stage) {
  if (!question || stage == null || stage === undefined) return false;
  return question.stage === stage && isPlannerOriginated(question.source);
}

function computeConsecutiveDrillCount(transcript, lastQuestion) {
  if (!lastQuestion?.stage) return 0;
  let count = 0;
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i]?.question;
    if (!q) break;
    if (isSameStagePlannerDrill(q, lastQuestion.stage)) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

// D1 — stages whose arc_progress < target_questions, in arc order.
function computeRemainingStages(transcript, arc) {
  const progress = computeArcProgress(transcript, arc);
  return arc.arc
    .map((stage) => ({
      id: stage.id,
      label: stage.label,
      intent: stage.intent,
      target_questions: stage.target_questions,
      arc_progress: progress[stage.id] || 0,
    }))
    .filter((s) => s.arc_progress < s.target_questions);
}

// D3 — most recent prior turn's realized deltas (used for snap-back).
function computeLastRealizedDeltas(transcript) {
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const d = t[i]?.realized_deltas;
    if (d && Object.keys(d).length > 0) return d;
  }
  return {};
}

// D4 — consecutive trailing planner_added items with purpose=wellbeing.
function computeConsecutiveWellbeingClarifierCount(transcript) {
  let count = 0;
  const t = transcript || [];
  for (let i = t.length - 1; i >= 0; i--) {
    const q = t[i]?.question;
    if (!q) break;
    if (q.source === "planner_added" && q.purpose === "wellbeing") count += 1;
    else break;
  }
  return count;
}

// D5 — session-wide count of planner_added items with stage=null
// (thread-follows that left the arc rather than staying inside it).
function computeOffArcDrillCount(transcript) {
  let count = 0;
  for (const t of transcript || []) {
    const q = t?.question;
    if (q?.source === "planner_added" && (q.stage === null || q.stage === undefined)) {
      count += 1;
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
  selectedFocus = null,
  prep = null,
}) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "planTurn"), "utf8");
  const arc = getArc(ctx.meetingType);
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes: ctx.notes, focusPoints });
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
  const remainingStages = computeRemainingStages(transcript, arc);
  const lastRealizedDeltas = computeLastRealizedDeltas(transcript);
  const consecutiveWellbeingClarifierCount = computeConsecutiveWellbeingClarifierCount(transcript);
  const offArcDrillCount = computeOffArcDrillCount(transcript);
  const isFinalTurn = Number(remainingBudget) === 1;
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{PRIMARY_FOCUS_ID}}", sf?.id || "(none)")
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{ROLE}}", ctx.role || "(not provided)")
    .replaceAll("{{SENIORITY}}", ctx.seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcriptSummary, null, 2))
    .replaceAll("{{LAST_QUESTION_JSON}}", JSON.stringify(lastQuestion, null, 2))
    .replaceAll("{{LAST_ANSWER}}", lastAnswer || "(skipped)")
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2))
    .replaceAll("{{REMAINING_QUEUE_JSON}}", JSON.stringify(queueSummary, null, 2))
    .replaceAll("{{REMAINING_BUDGET}}", String(remainingBudget))
    .replaceAll("{{TURN_NUMBER}}", String(turnNumber ?? "?"))
    .replaceAll("{{TOTAL_TURNS}}", String(totalTurns ?? "?"))
    .replaceAll("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc, null, 2))
    .replaceAll("{{TONE_REGISTER}}", arc.tone_register)
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replaceAll("{{CURRENT_STAGE_HINT}}", currentStageHint)
    .replaceAll("{{ARC_PROGRESS_JSON}}", JSON.stringify(arcProgress, null, 2))
    .replaceAll("{{CONSECUTIVE_DRILL_COUNT}}", String(consecutiveDrillCount))
    .replaceAll("{{REMAINING_STAGES_JSON}}", JSON.stringify(remainingStages, null, 2))
    .replaceAll("{{LAST_REALIZED_DELTAS_JSON}}", JSON.stringify(lastRealizedDeltas, null, 2))
    .replaceAll("{{CONSECUTIVE_WELLBEING_CLARIFIER_COUNT}}", String(consecutiveWellbeingClarifierCount))
    .replaceAll("{{OFF_ARC_DRILL_COUNT}}", String(offArcDrillCount))
    .replaceAll("{{IS_FINAL_TURN}}", isFinalTurn ? "true" : "false")
    .replaceAll("{{CLOSER_ALIAS}}", closerAlias || "(none)")
    .replaceAll("{{PREP_CORE_ISSUE}}", prep?.coreIssue?.trim() ? prep.coreIssue.trim() : "(none)")
    .replaceAll(
      "{{PREP_LISTEN_FOR_JSON}}",
      Array.isArray(prep?.listenFor) && prep.listenFor.length
        ? JSON.stringify(prep.listenFor, null, 2)
        : "(none)"
    )
    .replaceAll(
      "{{ROLE_PROFILE_BLOCK}}",
      // Slim slice — this prompt runs every dynamic turn, so only summary,
      // terminology, and listen_for ride along (token budget).
      renderRoleProfileBlock(loadRoleProfile({ role: ctx.role, seniority: ctx.seniority }), {
        slice: "planner",
        meetingType: ctx.meetingType,
      })
    );

  return splitSystemUser(filled);
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
  return ALLOWED_DELTAS.reduce((best, d) => {
    const dd = Math.abs(d - n);
    const bd = Math.abs(best - n);
    if (dd < bd) return d;
    // Equal distance: snap toward zero (lower magnitude), deterministically for
    // both signs — not by accident of array order.
    if (dd === bd && Math.abs(d) < Math.abs(best)) return d;
    return best;
  });
}

function toAxisObject(effects) {
  const out = {};
  for (const e of effects || []) {
    if (e && AXIS_IDS.includes(e.axis)) out[e.axis] = snapToAllowedDelta(e.delta);
  }
  return out;
}

// Enforce the question's signature: drop axes not in signature, clamp
// magnitude to the signature's magnitude. Returns the clamped delta object,
// a list of violations for logging, and the structured overflow (signal the
// clamp held back) so it can be preserved as unbooked_signal instead of lost.
// Privacy: overflow entries hold ONLY axis/raw/booked/reason — never answer
// text, note fragments, or model explanations.
function clampToSignature(rawDeltas, signature) {
  const sigKeys = Object.keys(signature || {});
  const deltas = {};
  const issues = [];
  const overflow = [];
  // A question with no signature drops every delta as "off-signature" and books
  // nothing for the turn. That is sometimes legitimate, but it must not vanish
  // silently — surface it loudly so a missing axis_effects is debuggable.
  if (sigKeys.length === 0 && AXIS_IDS.some((a) => rawDeltas[a])) {
    const msg = "EMPTY-SIGNATURE: scored question has no axis_effects — all deltas dropped, turn booked nothing";
    issues.push(msg);
    console.warn(`[plan-turn] ${msg}`);
  }
  for (const axis of AXIS_IDS) {
    const rawDelta = rawDeltas[axis];
    if (rawDelta === undefined || rawDelta === null) continue;
    if (!sigKeys.includes(axis)) {
      issues.push(`dropped off-signature delta: ${axis} ${rawDelta > 0 ? "+" : ""}${rawDelta}`);
      if (rawDelta !== 0) {
        overflow.push({
          axis,
          raw: rawDelta,
          booked: 0,
          reason: sigKeys.length === 0 ? "empty_signature" : "off_signature",
        });
      }
      continue;
    }
    const mag = Math.abs(signature[axis]);
    const clamped = Math.max(-mag, Math.min(mag, rawDelta));
    if (clamped !== rawDelta) {
      issues.push(`clamped ${axis} ${rawDelta} → ${clamped} (signature magnitude ${mag})`);
      overflow.push({ axis, raw: rawDelta, booked: clamped, reason: "clamped" });
    }
    if (clamped !== 0) deltas[axis] = clamped;
  }
  return { deltas, issues, overflow };
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

// Repeat detection lives in the central eligibility gate so every admission
// path compares question text the same way.
const {
  checkQuestionEligibility,
  contentTokens,
  isRepeatOfAsked,
} = require("./question-eligibility");

// Grounding gate for planner-written questions. The planner must cite a short
// verbatim quote from this session (`grounding`) for every new or reworded
// item, or mark it "open" (assumes nothing). A question whose premise this
// session never established is dropped whole — never patched up (the Jun 12
// Marcus run asked about a "promotion decision" that never happened; the
// Jun 12 Jordan run invented an "architecture review" forum).
const GROUNDING_OPEN = "open";

function normalizeGrounding(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Words any coaching question may use without the session saying them first.
// Only consulted for "open" (premise-free) items; everything else ≥5 chars
// must trace to the grounding corpus. Conservative direction: a word in this
// list can never cause a drop.
const OPEN_QUESTION_VOCAB = new Set([
  "ahead", "balance", "biggest", "capacity", "change", "changed", "changes",
  "clarity", "clearer", "concrete", "conversation", "decide", "decision",
  "decisions", "describe", "different", "differently", "easier", "easiest",
  "energy", "example", "expect", "expected", "focus", "forward", "getting",
  "going", "happen", "happened", "happening", "harder", "hardest", "helped",
  "helpful", "helping", "instead", "lately", "looking", "manager", "matter",
  "matters", "meeting", "moment", "month", "months", "moving", "needs",
  "nothing", "noticed", "otherwise", "outcome", "people", "picture",
  "priorities", "priority", "progress", "quarter", "really", "reason",
  "recent", "recently", "review", "reviews", "should", "situation", "snagged",
  "snagging", "someone",
  "something", "specific", "specifically", "start", "started", "success",
  "support", "taking", "talked", "talking", "thing", "things", "thinking",
  "through", "today", "together", "trying", "understand", "version", "wanted",
  "weeks", "working", "yourself",
]);

// Rare content words in an "open" question that the corpus never said.
// Tokens are matched on a 5-char stem so inflections don't false-positive.
function unsupportedOpenTokens(name, corpusNorm) {
  return [...contentTokens(name)]
    .filter((w) => w.length >= 5 && !OPEN_QUESTION_VOCAB.has(w))
    .filter((w) => !corpusNorm.includes(w.slice(0, 5)));
}

// True when the cited grounding quote appears in the corpus — verbatim after
// normalisation, or all of its content words individually (tolerates light
// punctuation/reordering, not paraphrase).
function groundingQuoteSupported(grounding, corpusNorm) {
  const g = normalizeGrounding(grounding);
  if (!g) return false;
  if (corpusNorm.includes(g)) return true;
  const tokens = [...contentTokens(g)];
  return tokens.length > 0 && tokens.every((w) => corpusNorm.includes(w));
}

// Reconcile AI-returned items against the existing remaining queue +
// transcript. Produces the materialised queue of question objects.
function reconcileQueue(rawNewQueue, { remainingQueue, askedAliases, askedNames = [], meetingType = null, groundingCorpus = null }) {
  const byAlias = new Map(remainingQueue.map((q) => [q.alias, q]));
  const existingAliases = listAllAliases();
  for (const q of remainingQueue) existingAliases.add(q.alias);
  for (const a of askedAliases) existingAliases.add(a);
  const askedTokenSets = askedNames.map(contentTokens);
  const out = [];
  const issues = [];
  const usedAliases = new Set();

  for (let item of rawNewQueue || []) {
    if (!item) {
      issues.push("dropped empty planner item");
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
    if (!Array.isArray(item.axis_effects) || item.axis_effects.length === 0) {
      // The planner often omits axis_effects on carried-forward refs. That's
      // recoverable — inherit the referenced question's signature rather than
      // dropping the question (the old order dropped BEFORE ref resolution,
      // which bled signatures out of runs until axes shipped "not read").
      if (ref) {
        item = {
          ...item,
          axis_effects: Object.entries(ref.axis_effects || {}).map(([axis, delta]) => ({ axis, delta })),
        };
        issues.push(`inherited axis_effects from ${ref.alias}`);
      } else {
        issues.push(`dropped item with empty axis_effects: ${item.label || "(no label)"}`);
        continue;
      }
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

    if (isRepeatOfAsked(item.name, askedTokenSets)) {
      issues.push(`dropped repeat of already-asked question: ${item.name}`);
      continue;
    }

    // New planner items also pass the type's forbidden patterns — the planner
    // free-writes question text every turn, so it can violate the 1:1 type's
    // rules just like a bad opener or seed.
    const eligibility = checkQuestionEligibility(item, { meetingType });
    if (!eligibility.ok) {
      issues.push(
        `eligibility: dropped planner item "${item.label || item.name}" (${eligibility.reason}: ${eligibility.matched})`
      );
      continue;
    }

    // Relational-arc gate: the planner can't write an evaluative question into
    // a check-in. No ref carry-forward here — if the planner labelled it
    // competency, the original (if any) is suspect for the same reason.
    if (item.purpose === "competency" && isRelationalArc(meetingType)) {
      issues.push(
        `arc gate: dropped planner competency question for relational arc: ${item.label || item.name}`
      );
      continue;
    }

    // Grounding gate — new/reworded wording must cite a premise this session
    // actually established. On failure, carry the untouched original forward
    // (if any) instead of the planner's version; never reword the stem.
    if (groundingCorpus != null) {
      const g = normalizeGrounding(item.grounding);
      const failed =
        !g || g === GROUNDING_OPEN
          ? unsupportedOpenTokens(item.name, groundingCorpus).length > 0
          : !groundingQuoteSupported(item.grounding, groundingCorpus);
      if (failed) {
        const why =
          !g || g === GROUNDING_OPEN
            ? `unsupported premise (${unsupportedOpenTokens(item.name, groundingCorpus).join(", ")})`
            : `unverifiable premise quote ("${item.grounding}")`;
        issues.push(`grounding: dropped planner question with ${why}: ${item.label || item.name}`);
        if (ref && !usedAliases.has(ref.alias)) {
          usedAliases.add(ref.alias);
          out.push(ref);
        }
        continue;
      }
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
      // Carried into the transcript so the grounding audit can re-verify
      // served questions after the fact.
      ...(item.grounding ? { grounding: item.grounding } : {}),
    };
    saveQuestion(q, { subdir: RUNTIME_SUBDIR });
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
  if (trimmed === "(skipped)") return false;

  // Answers are the manager's shorthand notes — terse by design. A 3-token note
  // ("Wants clearer scope.") is real signal, so the floor is ≤2 tokens, aligned
  // with computeReadQuality in reviewer.js. The FILLER_ONLY list below still
  // catches "fine"/"good"/etc. regardless of length.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.length <= 2) return true;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const FILLER_ONLY =
    /^(yeah|yes|yep|yup|ok|okay|fine|good|great|sure|cool|thanks|thank you|not bad|doing fine|i am fine|im fine|today is fine|its fine|it's fine|they are okay|every day|every time)$/;
  if (FILLER_ONLY.test(normalized)) return true;

  // A reporting wrapper ("yeah he said things have been ok") can clear the
  // 2-token floor while carrying no signal. Strip the wrapper; if nothing
  // concrete is left, it is shallow. Kept aligned with isLowContentNote in
  // reviewer.js.
  const REPORTING_PREFIX =
    /^(yeah|yes|yep|ok|okay)?[\s,]*\b(he|she|they)?\s*(said|says|told me|mentioned|noted|reckons|feels|felt|thinks)\b[\s,]*(that|it)?\s*/i;
  const LOW_SIGNAL_WORDS = new Set([
    "things", "stuff", "it", "that", "everything", "work", "the", "a",
    "have", "has", "had", "are", "is", "was", "were", "be", "been", "being",
    "feel", "feels", "felt", "seem", "seems", "going",
    "ok", "okay", "fine", "good", "great", "alright", "steady", "same",
    "grand", "really", "just", "pretty", "quite", "bit", "so", "far",
  ]);
  const remainder = normalized.replace(REPORTING_PREFIX, "").trim();
  if (remainder && remainder !== normalized) {
    const content = remainder.split(/\s+/).filter((w) => w && !LOW_SIGNAL_WORDS.has(w));
    if (content.length === 0) return true;
  }
  return false;
}

function noteMarksShallow(note) {
  return typeof note === "string" && note.includes("[SHALLOW]");
}

function detectClarityMisalignment(answer) {
  if (!answer || typeof answer !== "string") return false;
  const lower = answer.toLowerCase();
  if (/\bmay think this\b.*\bmay think that\b/.test(lower)) return true;
  if (/\b(i|my|me)\b/.test(lower) && /\b(boss|manager|lead)\b/.test(lower)) {
    if (/\b(think|expects|expected|want|needs|learn|understand|align)\b/.test(lower)) return true;
  }
  if (/\b(not aligned|misaligned|on different pages|different expectations)\b/.test(lower)) return true;
  return false;
}

function expandSignatureForSignals(signature, answer) {
  const sig = { ...(signature || {}) };
  if (detectClarityMisalignment(answer) && sig.clarity == null) {
    sig.clarity = 3;
  }
  return sig;
}

function applyShallowGate(rawDeltas, { lastAnswer, note, issues }) {
  const answerIsSkip = !lastAnswer || lastAnswer === "(skipped)";
  const shallow = !answerIsSkip && (isShallowAnswer(lastAnswer) || noteMarksShallow(note));
  if (!shallow) return false;
  for (const axis of Object.keys(rawDeltas)) {
    if (rawDeltas[axis] !== 0) {
      issues.push(`shallow answer — zeroed ${axis} (${rawDeltas[axis] > 0 ? "+" : ""}${rawDeltas[axis]})`);
      rawDeltas[axis] = 0;
    }
  }
  return true;
}

function applyMisalignmentClarity(rawDeltas, { lastAnswer, signature, issues }) {
  if (!detectClarityMisalignment(lastAnswer)) return;
  if (!Object.prototype.hasOwnProperty.call(signature, "clarity")) return;
  const mag = Math.abs(signature.clarity);
  const current = rawDeltas.clarity;
  if (current == null || current >= 0) {
    const applied = -Math.min(mag, 1);
    rawDeltas.clarity = applied;
    issues.push(`misalignment signal — applied clarity ${applied}`);
  }
}

// Recurring-gap clarity damper. A concrete craft gap surfaced on a competency
// question (missed edge case, uncovered state, defect found in review) is
// evidence about the *work*, not proof the report lacks role/priority clarity.
// plan-turn.md tells the model to book at most one full-magnitude clarity hit
// on a recurring gap and cap later descriptions at -1, but the model stacks
// -3s across consecutive gap turns (the Maya run clamped clarity to -10 off one
// repeated fact). Enforce it deterministically: once any prior competency turn
// has booked a negative clarity delta, cap this turn's clarity at -1.
function priorCompetencyClarityHit(transcript) {
  for (const t of transcript || []) {
    if (t?.question?.purpose !== "competency") continue;
    const d = t?.realized_deltas;
    if (d && Number(d.clarity) < 0) return true;
  }
  return false;
}

// Connective/filler words stripped before comparing two notes — we match on the
// content of the gap, not the grammar around it.
const DAMPER_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "it",
  "is", "are", "was", "were", "be", "she", "he", "they", "her", "his", "them",
  "i", "we", "you", "that", "this", "but", "not", "no", "so", "if", "as", "at",
  "before", "after", "what", "when", "how", "why", "still", "mostly", "more",
  "less", "too", "very", "just", "then", "than", "into", "out", "up", "down",
]);

function answerThemeTokens(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !DAMPER_STOPWORDS.has(w))
  );
}

// Two short notes are "the same recurring point" when their content words
// overlap on 2+ terms. Distinct gaps (different nouns) don't trip this, so a
// genuinely new clarity issue still scores at full weight.
function sharesAnswerTheme(a, b) {
  const ta = answerThemeTokens(a);
  if (ta.size < 2) return false;
  const tb = answerThemeTokens(b);
  if (tb.size < 2) return false;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  return shared >= 2;
}

// Has an earlier turn already booked a negative clarity hit on the SAME point
// the current answer is making? Theme-based, so it fires regardless of how the
// question's `purpose` was tagged — including scripted runs (purpose:"scripted")
// where the competency gate above never matches.
function priorSameThemeClarityHit(transcript, currentAnswer) {
  for (const t of transcript || []) {
    const d = t?.realized_deltas;
    if (!(d && Number(d.clarity) < 0)) continue;
    if (sharesAnswerTheme(currentAnswer, t?.answer)) return true;
  }
  return false;
}

function applyRecurringGapClarityDamper(rawDeltas, { lastQuestion, transcript, issues, lastAnswer }) {
  const current = rawDeltas.clarity;
  if (current == null || current >= -1) return;
  // Trigger A — craft-gap competency stacking (the original Jun03 case).
  const competencyRecurrence =
    lastQuestion?.purpose === "competency" && priorCompetencyClarityHit(transcript);
  // Trigger B — the same point re-scored across turns, whatever the purpose tag.
  // This is what floored the Maya Jun17 run: six turns all describing one
  // review-readiness gap, each booking a fresh clarity negative to -10.
  const themeRecurrence = priorSameThemeClarityHit(transcript, lastAnswer);
  if (!competencyRecurrence && !themeRecurrence) return;
  issues.push(`recurring-gap damper — capped clarity ${current} → -1`);
  rawDeltas.clarity = -1;
}

function isRuntimeThreadFollow(q) {
  return q?.source === "planner_added" && q?.label === "Thread follow";
}

// Coverage must be honest: an untouched axis gets a REAL question that probes
// it — never an axis label stamped onto a question whose text doesn't carry it
// (the Maya run logged wellbeing:3 on a retry-logic follow-up). Order: promote
// an axis-carrying item already in the queue; else pull a bank/seed question
// that fits the current arc; else leave the queue alone and log it — the
// briefing already degrades honestly (untouched axis → "not read").
function enforceAxisCoverage({
  newQueue,
  axisState,
  turnNumber,
  issues,
  askedAliases = new Set(),
  askedNames = [],
  arc = null,
  transcript = [],
  meetingType = null,
  bankLoader = () => [...loadDir("").filter(isCuratedBankQuestion), ...loadDir("_seed")],
}) {
  if (turnNumber < 4 || !Array.isArray(newQueue) || !newQueue.length) return newQueue;
  const untouched = AXIS_IDS.filter((id) => (axisState[id]?.history?.length ?? 0) === 0);
  if (!untouched.length) return newQueue;
  const priority = ["clarity", "engagement", "wellbeing", "growth"].find((id) => untouched.includes(id));
  if (!priority) return newQueue;
  // Runtime thread-follows are content-locked topical follow-ups — never
  // displace one; the coverage question slots in right after it.
  const insertAt = isRuntimeThreadFollow(newQueue[0]) ? 1 : 0;
  const target = newQueue[insertAt];
  if (target?.axis_effects?.[priority]) return newQueue;

  // Step 1 — promote a later queue item that already carries the axis.
  for (let i = insertAt + 1; i < newQueue.length; i++) {
    const q = newQueue[i];
    if (q?.axis_effects?.[priority]) {
      const queue = [...newQueue];
      queue.splice(i, 1);
      queue.splice(insertAt, 0, q);
      issues.push(
        `coverage: promoted ${q.alias || q.label} (carries ${priority}, 0 touches after turn ${turnNumber})`
      );
      return queue;
    }
  }

  // Step 2 — pull a real bank/seed question that probes the axis AND fits the
  // conversation: its stage must be null or belong to this meeting's arc
  // (axis-correct but conversation-wrong is the same dishonesty in new clothes).
  const arcStageIds = new Set((arc?.arc || []).map((s) => s.id));
  const underServed = new Set(
    arc ? computeRemainingStages(transcript, arc).map((s) => s.id) : []
  );
  const queuedAliases = new Set(newQueue.map((q) => q.alias));
  const askedTokenSets = askedNames.map(contentTokens);
  const candidates = (bankLoader() || []).filter((c) => {
    if (!c?.alias || !c?.name) return false;
    if (!c.axis_effects?.[priority]) return false;
    if (askedAliases.has(c.alias) || queuedAliases.has(c.alias)) return false;
    if (c.stage != null && arc && !arcStageIds.has(c.stage)) return false;
    if (isRepeatOfAsked(c.name, askedTokenSets)) return false;
    // Relational arcs never pull an evaluative question, even for axis coverage.
    if (c.purpose === "competency" && isRelationalArc(meetingType)) {
      issues.push(`arc gate: coverage skipped ${c.alias} (competency question in relational arc)`);
      return false;
    }
    const eligibility = checkQuestionEligibility(c, { meetingType });
    if (!eligibility.ok) {
      issues.push(
        `eligibility: coverage skipped ${c.alias} (${eligibility.reason}: ${eligibility.matched})`
      );
      return false;
    }
    return true;
  });
  const pick =
    candidates.find((c) => c.stage != null && underServed.has(c.stage)) ||
    candidates.find((c) => c.stage == null) ||
    candidates[0];
  if (pick) {
    const queue = [...newQueue];
    queue.splice(insertAt, 0, pick);
    if (queue.length > MAX_QUEUE) {
      issues.push(`truncated queue from ${queue.length} to ${MAX_QUEUE}`);
      queue.length = MAX_QUEUE;
    }
    issues.push(
      `coverage: inserted ${pick.alias} from bank (probes ${priority}, 0 touches after turn ${turnNumber})`
    );
    return queue;
  }

  // Step 3 — nothing honest available; say so and move on.
  issues.push(
    `coverage: ${priority} untouched after turn ${turnNumber} — no real question carries it; queue unchanged`
  );
  return newQueue;
}

// Pool-root artifacts from before runtime questions moved to _runtime: planner
// items and thread-follows saved by past sessions are write-only run records,
// never bank candidates (they carry another conversation's premises). The
// curated pool is source "generated"/seed material only. Load-time filter —
// the YAML files themselves stay where they are.
function isCuratedBankQuestion(q) {
  const source = String(q?.source || "");
  if (source === "planner_added" || source.startsWith("reworded_from")) return false;
  if (String(q?.alias || "").startsWith("q_thread_follow")) return false;
  return true;
}

function answerHasThread(answer) {
  if (!answer || answer === "(skipped)") return false;
  if (isShallowAnswer(answer)) return false;
  return answer.trim().split(/\s+/).filter(Boolean).length >= 5;
}

function followReferencesAnswer(answer, questionName) {
  const words = String(answer || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const q = String(questionName || "").toLowerCase();
  if (!words.length) return false;
  return words.filter((w) => q.includes(w)).length >= 1;
}

function firstQueueFollowsThread(queue, answer) {
  if (!Array.isArray(queue) || !queue.length) return false;
  return followReferencesAnswer(answer, queue[0]?.name);
}

const { validateQuestionBeforeShow } = require("./question-validator.ts");

// The mirror must quote a contiguous run of the answer's own words, clause-
// bounded. The old version took the first three long tokens from anywhere in
// the answer — a skip-gram that read as word salad on typo-heavy notes
// ("tell will working — can you say more…", Jun 02 Luke run).
const MIRROR_FILLER = /^(yeah|yes|yep|ok|okay|well|so|um|uh|and|but)\s+/i;
function contiguousAnswerSpan(answer) {
  for (const raw of String(answer || "").split(/[.!?;,\n—–]+/)) {
    let clause = raw.replace(/[^a-z0-9\s'-]/gi, " ").replace(/\s+/g, " ").trim();
    while (MIRROR_FILLER.test(clause)) clause = clause.replace(MIRROR_FILLER, "");
    const words = clause.split(" ").filter(Boolean);
    if (words.length >= 3) return words.slice(0, 6).join(" ");
  }
  return null;
}

// Ground-or-skip: a thread-follow must mirror the answer's own words. If the
// mirror stem can't pass validation, return null and inject nothing — a canned
// context-free stem fakes a connection the engine didn't make (the Jun 11
// Machar run served the identical generic stem on consecutive turns and it
// read as disconnected both times).
function buildThreadFollowQuestion(lastQuestion, lastAnswer, transcript) {
  const mirrorSpan = contiguousAnswerSpan(lastAnswer);
  if (!mirrorSpan) return null;
  const mirrorStem = `${mirrorSpan} — can you say more about what that means for you right now?`;

  const mirrorCheck = validateQuestionBeforeShow({
    name: mirrorStem,
    answer: lastAnswer,
    transcript,
  });
  if (!mirrorCheck.ok) return null;

  const alias = newAlias("thread follow", listAllAliases());
  return {
    alias,
    label: "Thread follow",
    name: mirrorStem,
    description: "Following up on what they just said.",
    purpose: lastQuestion?.purpose || "topic",
    stage: lastQuestion?.stage ?? null,
    axis_effects: { ...(lastQuestion?.axis_effects || { engagement: 1 }) },
    source: "planner_added",
  };
}

function enforceThreadFollow({
  newQueue,
  lastAnswer,
  lastQuestion,
  remainingBudget,
  consecutiveDrillCount,
  askedNames = [],
  transcript = [],
  issues,
}) {
  if (Number(remainingBudget) <= 2) return newQueue;
  if (consecutiveDrillCount >= 2) return newQueue;
  if (!answerHasThread(lastAnswer)) return newQueue;
  if (firstQueueFollowsThread(newQueue, lastAnswer)) return newQueue;
  const follow = buildThreadFollowQuestion(lastQuestion, lastAnswer, transcript);
  if (!follow) {
    issues.push("runtime: thread-follow skipped (no stem grounded in the answer)");
    return newQueue;
  }
  // Don't inject a thread-follow that repeats a question already asked — or
  // one already sitting in the queue, which would be served as a duplicate a
  // few turns later.
  const askedTokenSets = (askedNames || []).map(contentTokens);
  const queuedTokenSets = (newQueue || []).map((q) => contentTokens(q?.name));
  if (isRepeatOfAsked(follow.name, [...askedTokenSets, ...queuedTokenSets])) {
    issues.push("runtime: thread-follow skipped (would repeat an asked or queued question)");
    return newQueue;
  }
  issues.push("runtime: injected thread-follow question");
  saveQuestion(follow, { subdir: RUNTIME_SUBDIR });
  return [follow, ...(newQueue || [])];
}

function enforceDrillCap({
  newQueue,
  lastQuestion,
  remainingQueue,
  consecutiveDrillCount,
  transcript,
  arc,
  issues,
}) {
  let queue = [...(newQueue || [])];
  const lastStage = lastQuestion?.stage;
  if (lastStage == null || lastStage === undefined || consecutiveDrillCount < 2) {
    return queue;
  }

  while (queue.length && isSameStagePlannerDrill(queue[0], lastStage)) {
    const dropped = queue[0];
    issues.push(`drill cap: removed same-stage drill at ${lastStage} (${dropped.alias || dropped.label})`);
    queue = queue.slice(1);
  }

  const remainingStages = computeRemainingStages(transcript, arc);
  if (!remainingStages.length) return queue;
  const targetStage = remainingStages[0].id;
  const pool = [...(remainingQueue || []), ...queue];
  const candidate = pool.find((q) => q.stage === targetStage);
  if (candidate && queue[0]?.alias !== candidate.alias) {
    queue = [candidate, ...queue.filter((q) => q.alias !== candidate.alias)];
    issues.push(`drill cap: advanced queue toward stage ${targetStage}`);
  }
  return queue;
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
  selectedFocus = null,
  prep = null,
  sessionBank = null,
}) {
  validateAxisState(axisState);

  const skipShortcutEligible = (!lastAnswer || lastAnswer === "(skipped)")
    && Number(remainingBudget) !== 1
    && Array.isArray(remainingQueue) && remainingQueue.length > 0
    && (transcript || []).slice(-2).filter((t) => t?.skipped).length < 2;
  if (skipShortcutEligible) {
    return {
      assessment: { deltas: {}, note: "[SKIP] no signal — planner bypassed, queue carried forward" },
      newQueue: remainingQueue,
      issues: [],
      unbooked_signal: [],
      prompt: null,
      response: null,
    };
  }

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
    selectedFocus,
    prep,
  });
  const raw = await callOpenAI({ ...msgs, model });
  const parsed = parseAIJson(raw, "Queue planner", ["assessment", "new_queue"]);

  const rawDeltas = toAxisObject(parsed.assessment?.deltas);
  const gateIssues = [];
  applyShallowGate(rawDeltas, {
    lastAnswer,
    note: parsed.assessment?.note || "",
    issues: gateIssues,
  });

  const effectiveSignature = expandSignatureForSignals(lastQuestion.axis_effects || {}, lastAnswer);
  applyMisalignmentClarity(rawDeltas, {
    lastAnswer,
    signature: effectiveSignature,
    issues: gateIssues,
  });
  applyRecurringGapClarityDamper(rawDeltas, {
    lastQuestion,
    transcript,
    issues: gateIssues,
    lastAnswer,
  });

  const { deltas, issues: sigIssues, overflow } = clampToSignature(rawDeltas, effectiveSignature);
  const assessment = {
    deltas,
    note: parsed.assessment?.note || "",
  };

  const askedAliases = new Set((transcript || []).map((t) => t.question.alias));
  const askedNames = (transcript || []).map((t) => t.question.name);
  const arc = getArc(ctx.meetingType);
  // Everything this session has actually put on the table — the haystack a
  // planner-written question's premise must be found in.
  const groundingCorpus = normalizeGrounding(
    [
      ctx.notes,
      ctx.name,
      ctx.role,
      ...(transcript || []).flatMap((t) => [t?.question?.name, t?.answer]),
      ...(remainingQueue || []).map((q) => q?.name),
      prep ? JSON.stringify(prep) : "",
      focusPoints ? JSON.stringify(focusPoints) : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
  const { queue: reconciledQueue, issues: queueIssues } = reconcileQueue(parsed.new_queue, {
    remainingQueue,
    askedAliases,
    askedNames,
    meetingType: ctx.meetingType,
    groundingCorpus,
  });
  const consecutiveDrillCount = computeConsecutiveDrillCount(transcript, lastQuestion);
  let newQueue = enforceThreadFollow({
    newQueue: reconciledQueue,
    lastAnswer,
    lastQuestion,
    remainingBudget,
    consecutiveDrillCount,
    askedNames,
    transcript,
    issues: gateIssues,
  });
  newQueue = enforceDrillCap({
    newQueue,
    lastQuestion,
    remainingQueue,
    consecutiveDrillCount,
    transcript,
    arc,
    issues: gateIssues,
  });
  newQueue = enforceAxisCoverage({
    newQueue,
    axisState,
    turnNumber: turnNumber ?? (transcript || []).length,
    issues: gateIssues,
    askedAliases,
    askedNames,
    arc,
    transcript,
    meetingType: ctx.meetingType,
    // Scope coverage to THIS session's pool so it can't surface another
    // persona's saved question from the global bank. Any supplied array is
    // authoritative — even an empty one means "seeds only", never the global
    // bank. Only a caller that passes nothing at all gets the global default.
    bankLoader:
      Array.isArray(sessionBank)
        ? () => [...sessionBank, ...loadDir("_seed")]
        : undefined,
  });

  return {
    assessment,
    newQueue,
    issues: [...gateIssues, ...sigIssues, ...queueIssues],
    unbooked_signal: overflow,
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
  snapToAllowedDelta,
  isShallowAnswer,
  noteMarksShallow,
  detectClarityMisalignment,
  expandSignatureForSignals,
  applyShallowGate,
  applyMisalignmentClarity,
  applyRecurringGapClarityDamper,
  enforceAxisCoverage,
  enforceThreadFollow,
  buildThreadFollowQuestion,
  enforceDrillCap,
  isPlannerOriginated,
  isSameStagePlannerDrill,
  answerHasThread,
  followReferencesAnswer,
  computeArcProgress,
  computeConsecutiveDrillCount,
  computeRemainingStages,
  computeLastRealizedDeltas,
  computeConsecutiveWellbeingClarifierCount,
  computeOffArcDrillCount,
};
