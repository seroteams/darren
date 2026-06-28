import fs from "node:fs";

import { loadAxes, validateAxisState, AXIS_IDS } from "./axes.ts";
import { newAlias, saveQuestion, listAllAliases, loadDir } from "./questions.ts";
import { getArc } from "./meeting-arcs.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { promptFor } from "./one-on-one-types/index.ts";
import { resolveSelectedFocus } from "./selected-focus.ts";
import { splitSystemUser } from "./prompt-utils.ts";
import { loadRoleProfile, renderRoleProfileBlock } from "./role-profile.ts";

import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";
// Repeat detection lives in the central eligibility gate so every admission
// path compares question text the same way.
import {
  checkQuestionEligibility,
  contentTokens,
  isRepeatOfAsked,
} from "./question-eligibility.ts";
import { validateQuestionBeforeShow } from "./question-validator.ts";

import type { Question, QuestionPurpose } from "../shared/question.types.ts";
import type { AxisState, TranscriptEntry } from "../shared/session.types.ts";
import { isObjectRecord, asRecord, asString } from "../shared/guards.ts";
import { buildMessages } from "./messages.ts";
import type { BuildMessagesCtx, PlannerPrep } from "./messages.ts";
import { ALLOWED_DELTAS, MAX_QUEUE, RUNTIME_SUBDIR } from "./queue-constants.ts";
import type { Arc } from "./queue-constants.ts";
import {
  isPlannerOriginated,
  isSameStagePlannerDrill,
  computeArcProgress,
  computeConsecutiveDrillCount,
  computeRemainingStages,
  computeLastRealizedDeltas,
  computeConsecutiveWellbeingClarifierCount,
  computeOffArcDrillCount,
} from "./queue-metrics.ts";
import { enforceAxisCoverage } from "./axis-coverage.ts";
import {
  isRuntimeThreadFollow,
  answerHasThread,
  followReferencesAnswer,
  buildThreadFollowQuestion,
  enforceThreadFollow,
} from "./thread-follow.ts";
import {
  isShallowAnswer,
  noteMarksShallow,
  detectClarityMisalignment,
  expandSignatureForSignals,
  applyShallowGate,
  applyMisalignmentClarity,
  applyRecurringGapClarityDamper,
} from "./delta-gates.ts";

const getDefaultModel = () => modelFor("planner");

// Disk JSON / model output is unknown until checked — narrow with these instead
// of trusting shapes (the established house pattern).

// A raw queue item as the planner emits it on the wire (axis_effects is an
// array here; toAxisObject converts it). All fields are permissive because the
// reconcile/coverage code reads them defensively.
interface RawQueueItem {
  ref_alias?: string | null;
  label?: string;
  name?: string;
  description?: string;
  purpose?: QuestionPurpose;
  stage?: string | null;
  axis_effects?: AxisEffect[];
  grounding?: string;
}

// One {axis, delta} pair on the wire.
interface AxisEffect {
  axis: string;
  delta: number;
}

// REVIEW: parseAIJson returns unknown. The wire is schema-constrained, but the
// value is still unknown here — narrow it to the array reconcileQueue reads.
// Each element is an object or falsy (the loop's `if (!item)` already tolerates
// falsy); fields are then read defensively, exactly as the original did.
function isRawQueueArray(v: unknown): v is RawQueueItem[] {
  return Array.isArray(v) && v.every((e) => e == null || typeof e === "object");
}

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

async function callOpenAI({ system, user, model }: { system: string; user: string; model: string }): Promise<string> {
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

function snapToAllowedDelta(raw: unknown): number {
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

function toAxisObject(effects: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  // original passed model output straight in; AXIS_IDS.includes() already guards
  // a bad shape, so narrow each element to read .axis/.delta. (unknown[] not the
  // any[] that Array.isArray would otherwise widen the loop var to.)
  const items: unknown[] = Array.isArray(effects) ? effects : [];
  for (const e of items) {
    if (isObjectRecord(e) && typeof e.axis === "string" && AXIS_IDS.includes(e.axis)) out[e.axis] = snapToAllowedDelta(e.delta);
  }
  return out;
}

// Enforce the question's signature: drop axes not in signature, clamp
// magnitude to the signature's magnitude. Returns the clamped delta object,
// a list of violations for logging, and the structured overflow (signal the
// clamp held back) so it can be preserved as unbooked_signal instead of lost.
// Privacy: overflow entries hold ONLY axis/raw/booked/reason — never answer
// text, note fragments, or model explanations.
function clampToSignature(rawDeltas: Record<string, number>, signature: Record<string, number> | null | undefined): { deltas: Record<string, number>; issues: string[]; overflow: Array<{ axis: string; raw: number; booked: number; reason: string }> } {
  const sigKeys = Object.keys(signature || {});
  const deltas: Record<string, number> = {};
  const issues: string[] = [];
  const overflow: Array<{ axis: string; raw: number; booked: number; reason: string }> = [];
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
    const mag = Math.abs(signature?.[axis] ?? 0);
    const clamped = Math.max(-mag, Math.min(mag, rawDelta));
    if (clamped !== rawDelta) {
      issues.push(`clamped ${axis} ${rawDelta} → ${clamped} (signature magnitude ${mag})`);
      overflow.push({ axis, raw: rawDelta, booked: clamped, reason: "clamped" });
    }
    if (clamped !== 0) deltas[axis] = clamped;
  }
  return { deltas, issues, overflow };
}

function axisCoverage(axisState: AxisState): Record<string, { score: number; touches: number }> {
  const out: Record<string, { score: number; touches: number }> = {};
  for (const id of AXIS_IDS) {
    const slot = axisState[id];
    // Use ?? not || so that legitimate negative scores aren't coerced to 0
    out[id] = { score: slot?.score ?? 0, touches: slot?.history?.length ?? 0 };
  }
  return out;
}

// Returns true iff a reconstructed queue item matches the referenced existing
// question on the canonical fields (ignoring whitespace).
function isUnchanged(refOriginal: Question | null | undefined, incoming: RawQueueItem): boolean {
  if (!refOriginal) return false;
  const norm = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
  if (norm(refOriginal.name) !== norm(incoming.name)) return false;
  if (norm(refOriginal.label) !== norm(incoming.label)) return false;
  if (norm(refOriginal.description) !== norm(incoming.description)) return false;
  const a = refOriginal.axis_effects || {};
  const b = toAxisObject(incoming.axis_effects);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
}

// Grounding gate for planner-written questions. The planner must cite a short
// verbatim quote from this session (`grounding`) for every new or reworded
// item, or mark it "open" (assumes nothing). A question whose premise this
// session never established is dropped whole — never patched up (the Jun 12
// Marcus run asked about a "promotion decision" that never happened; the
// Jun 12 Jordan run invented an "architecture review" forum).
const GROUNDING_OPEN = "open";

function normalizeGrounding(s: unknown): string {
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
function unsupportedOpenTokens(name: unknown, corpusNorm: string): string[] {
  return [...contentTokens(name)]
    .filter((w) => w.length >= 5 && !OPEN_QUESTION_VOCAB.has(w))
    .filter((w) => !corpusNorm.includes(w.slice(0, 5)));
}

// True when the cited grounding quote appears in the corpus — verbatim after
// normalisation, or all of its content words individually (tolerates light
// punctuation/reordering, not paraphrase).
function groundingQuoteSupported(grounding: unknown, corpusNorm: string): boolean {
  const g = normalizeGrounding(grounding);
  if (!g) return false;
  if (corpusNorm.includes(g)) return true;
  const tokens = [...contentTokens(g)];
  return tokens.length > 0 && tokens.every((w) => corpusNorm.includes(w));
}

// Reconcile AI-returned items against the existing remaining queue +
// transcript. Produces the materialised queue of question objects.
function reconcileQueue(rawNewQueue: RawQueueItem[] | null | undefined, { remainingQueue, askedAliases, askedNames = [], meetingType = null, groundingCorpus = null }: { remainingQueue: Question[]; askedAliases: Set<string>; askedNames?: string[]; meetingType?: string | null; groundingCorpus?: string | null }): { queue: Question[]; issues: string[] } {
  const byAlias = new Map(remainingQueue.map((q) => [q.alias, q]));
  const existingAliases = listAllAliases();
  for (const q of remainingQueue) existingAliases.add(q.alias);
  for (const a of askedAliases) existingAliases.add(a);
  const askedTokenSets = askedNames.map(contentTokens);
  const out: Question[] = [];
  const issues: string[] = [];
  const usedAliases = new Set<string>();

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
    const eligibility = checkQuestionEligibility(item, { meetingType: meetingType ?? undefined });
    if (!eligibility.ok) {
      issues.push(
        `eligibility: dropped planner item "${item.label || item.name}" (${eligibility.reason}: ${eligibility.matched})`
      );
      continue;
    }

    // Relational-arc gate: the planner can't write an evaluative question into
    // a check-in. No ref carry-forward here — if the planner labelled it
    // competency, the original (if any) is suspect for the same reason.
    if (item.purpose === "competency" && isRelationalArc(meetingType ?? undefined)) {
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
    const q: Question = {
      alias,
      label: item.label ?? "",
      name: item.name ?? "",
      description: item.description ?? "",
      purpose: item.purpose ?? "topic",
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

function enforceDrillCap({
  newQueue,
  lastQuestion,
  remainingQueue,
  consecutiveDrillCount,
  transcript,
  arc,
  issues,
}: {
  newQueue: Question[];
  lastQuestion: Question | null | undefined;
  remainingQueue: Question[] | null | undefined;
  consecutiveDrillCount: number;
  transcript: TranscriptEntry[] | null | undefined;
  arc: Arc;
  issues: string[];
}): Question[] {
  let queue = [...(newQueue || [])];
  const lastStage = lastQuestion?.stage;
  if (lastStage == null || lastStage === undefined || consecutiveDrillCount < 2) {
    return queue;
  }

  while (queue.length && isSameStagePlannerDrill(queue[0], lastStage)) {
    const dropped = queue[0];
    issues.push(`drill cap: removed same-stage drill at ${lastStage} (${dropped?.alias || dropped?.label})`);
    queue = queue.slice(1);
  }

  const remainingStages = computeRemainingStages(transcript, arc);
  if (!remainingStages.length) return queue;
  const targetStage = remainingStages[0]?.id;
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
}: {
  focusPoints: unknown;
  ctx: PlanTurnCtx;
  transcript: TranscriptEntry[] | null | undefined;
  lastQuestion: Question;
  lastAnswer: string | null | undefined;
  axisState: AxisState;
  remainingQueue: Question[] | null | undefined;
  remainingBudget: number | string | null | undefined;
  turnNumber?: number | null;
  totalTurns?: number | null;
  closerAlias: string | null | undefined;
  model?: string;
  selectedFocus?: { id?: string } | null;
  prep?: PlannerPrep | null;
  sessionBank?: Question[] | null;
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
  const parsed = asRecord(parseAIJson(raw, "Queue planner", ["assessment", "new_queue"]));

  const assessmentRaw = asRecord(parsed.assessment);
  const rawDeltas = toAxisObject(assessmentRaw.deltas);
  const gateIssues: string[] = [];
  applyShallowGate(rawDeltas, {
    lastAnswer,
    note: typeof assessmentRaw.note === "string" ? assessmentRaw.note : "",
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
    note: typeof assessmentRaw.note === "string" ? assessmentRaw.note : "",
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
  const newQueueRaw = isRawQueueArray(parsed.new_queue) ? parsed.new_queue : undefined;
  const { queue: reconciledQueue, issues: queueIssues } = reconcileQueue(newQueueRaw, {
    remainingQueue: remainingQueue || [],
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
    transcript: transcript || [],
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
    transcript: transcript || [],
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

// planTurn additionally reads ctx.notes/name/role for the grounding corpus.
type PlanTurnCtx = BuildMessagesCtx;

export {
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
