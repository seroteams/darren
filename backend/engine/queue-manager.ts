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
import type { RawQueueItem } from "./queue-constants.ts";
import { reconcileQueue, normalizeGrounding, toAxisObject, snapToAllowedDelta } from "./reconcile-queue.ts";
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
import { classifyAnswer } from "./read-quality.ts";

const getDefaultModel = () => modelFor("planner");

// Disk JSON / model output is unknown until checked — narrow with these instead
// of trusting shapes (the established house pattern).

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
    // Resolved-cause repeat gate: the cause this question re-probes (copied
    // verbatim from resolved_causes, or "" for fresh ground), and whether it
    // asks a genuinely new layer on it. reconcileQueue drops an item that
    // re-probes a resolved cause with new_layer=false.
    probes_cause: { type: "string" },
    new_layer: { type: "boolean" },
  },
  required: ["ref_alias", "label", "name", "description", "purpose", "stage", "axis_effects", "grounding", "probes_cause", "new_layer"],
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
    // Causes the manager has already named AND explained this session. The
    // planner tags each new_queue item's probes_cause against this list; the
    // reconcile gate drops same-cause repeats that seek no new layer.
    resolved_causes: { type: "array", items: { type: "string" } },
    new_queue: { type: "array", items: QUEUE_ITEM },
  },
  required: ["assessment", "resolved_causes", "new_queue"],
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
  const queue = [...(newQueue || [])];
  const lastStage = lastQuestion?.stage;
  if (lastStage == null || lastStage === undefined || consecutiveDrillCount < 2) {
    return queue;
  }

  // A runtime thread-follow at slot 0 is a content-locked follow-up to what the
  // person just said — pin it so the cap slices and advances AROUND it, never
  // over it. (It inherits lastQuestion.stage, so without this it reads as a
  // same-stage planner drill and gets eaten below.) Mirrors the coverage gate's
  // slot-0 guard (axis-coverage.ts `insertAt`).
  const pinned = isRuntimeThreadFollow(queue[0]) ? queue[0] : null;
  let body = pinned ? queue.slice(1) : queue;

  while (body.length && isSameStagePlannerDrill(body[0], lastStage)) {
    const dropped = body[0];
    issues.push(`drill cap: removed same-stage drill at ${lastStage} (${dropped?.alias || dropped?.label})`);
    body = body.slice(1);
  }

  const remainingStages = computeRemainingStages(transcript, arc);
  if (remainingStages.length) {
    const targetStage = remainingStages[0]?.id;
    const pool = [...(remainingQueue || []), ...body];
    const candidate = pool.find((q) => q.stage === targetStage);
    if (candidate && body[0]?.alias !== candidate.alias) {
      body = [candidate, ...body.filter((q) => q.alias !== candidate.alias)];
      issues.push(`drill cap: advanced queue toward stage ${targetStage}`);
    }
  }
  return pinned ? [pinned, ...body] : body;
}

// Closer-on-final-turn gate. On the final turn (remaining_budget <= 1), if a
// real closer is reserved it MUST lead new_queue (plan-turn.md rule 7 / final-
// turn enforcement). Reorder it to the front if it's present but out of place,
// or pull it from the remaining queue if the planner dropped it. No-op off the
// final turn or when no closer is reserved.
function enforceCloserOnFinalTurn({
  newQueue,
  remainingBudget,
  closerAlias,
  remainingQueue,
  issues,
}: {
  newQueue: Question[];
  remainingBudget: number | string | null | undefined;
  closerAlias: string | null | undefined;
  remainingQueue: Question[] | null | undefined;
  issues: string[];
}): Question[] {
  const queue = [...(newQueue || [])];
  const isFinal = Number(remainingBudget) <= 1;
  if (!isFinal || !closerAlias || closerAlias === "(none)") return queue;
  if (queue[0]?.alias === closerAlias) return queue;

  const inQueue = queue.find((x) => x.alias === closerAlias);
  if (inQueue) {
    issues.push(`closer gate: moved reserved closer ${closerAlias} to front on final turn`);
    return [inQueue, ...queue.filter((x) => x.alias !== closerAlias)];
  }
  const fromRemaining = (remainingQueue || []).find((x) => x.alias === closerAlias);
  if (fromRemaining) {
    issues.push(`closer gate: pulled reserved closer ${closerAlias} from remaining queue to front on final turn`);
    return [fromRemaining, ...queue.filter((x) => x.alias !== closerAlias)];
  }
  issues.push(`closer gate: reserved closer ${closerAlias} not found in queue or remaining — could not enforce`);
  return queue;
}

// Budget-length gate. new_queue may hold at most remaining_budget + 1 items;
// when remaining_budget <= 2 it holds at most exactly remaining_budget (the
// wind-down taper — no over-queuing as the session lands). Only ever truncates
// the tail, so any front-loaded closer survives. (Run AFTER the closer gate.)
function enforceBudgetLength({
  newQueue,
  remainingBudget,
  issues,
}: {
  newQueue: Question[];
  remainingBudget: number | string | null | undefined;
  issues: string[];
}): Question[] {
  const queue = [...(newQueue || [])];
  const budget = Number(remainingBudget);
  if (!Number.isFinite(budget)) return queue;
  const cap = budget <= 2 ? Math.max(0, budget) : budget + 1;
  if (queue.length > cap) {
    issues.push(`budget: truncated queue ${queue.length} → ${cap} (remaining_budget ${budget})`);
    return queue.slice(0, cap);
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
      assessment: { deltas: {}, note: "[SKIP] no signal — planner bypassed, queue carried forward", read: "skip" as const },
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
  const note = typeof assessmentRaw.note === "string" ? assessmentRaw.note : "";
  const assessment = {
    deltas,
    note,
    // Bank the per-turn read-quality tag once, here, at the choke-point every
    // lane shares — reviewer consumes it instead of re-deriving. The note may
    // carry [SHALLOW] from applyShallowGate above, which classifyAnswer honours.
    read: classifyAnswer(lastAnswer, note),
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
  const resolvedCauses = Array.isArray(parsed.resolved_causes)
    ? parsed.resolved_causes.filter((s): s is string => typeof s === "string")
    : [];
  const { queue: reconciledQueue, issues: queueIssues } = reconcileQueue(newQueueRaw, {
    remainingQueue: remainingQueue || [],
    askedAliases,
    askedNames,
    meetingType: ctx.meetingType,
    groundingCorpus,
    resolvedCauses,
  });
  const consecutiveDrillCount = computeConsecutiveDrillCount(transcript, lastQuestion);
  let newQueue = enforceThreadFollow({
    newQueue: reconciledQueue,
    lastAnswer,
    lastQuestion,
    remainingBudget,
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

  // Queue-shape gates run last, on the final assembled queue. Closer first (so a
  // reserved closer is front-loaded), then budget (truncates the tail — the
  // front-loaded closer survives).
  newQueue = enforceCloserOnFinalTurn({
    newQueue,
    remainingBudget,
    closerAlias,
    remainingQueue,
    issues: gateIssues,
  });
  newQueue = enforceBudgetLength({ newQueue, remainingBudget, issues: gateIssues });

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

// Assemble the exact payload planTurn would send for the next turn — WITHOUT
// calling the model. Mirrors planTurn's axis validation + skip-shortcut + axes /
// axisCoverage prelude, so the preview is byte-for-byte what planTurn would log.
// Returns prompt:null when the planner would take its skip-shortcut — an honest
// "no model call at all" signal, not a prompt that never gets sent.
function assemblePlanTurn(
  args: Parameters<typeof planTurn>[0],
  { model = getDefaultModel() }: { model?: string } = {}
): { model: string; prompt: string | null } {
  validateAxisState(args.axisState);
  const skipShortcutEligible =
    (!args.lastAnswer || args.lastAnswer === "(skipped)") &&
    Number(args.remainingBudget) !== 1 &&
    Array.isArray(args.remainingQueue) &&
    args.remainingQueue.length > 0 &&
    (args.transcript || []).slice(-2).filter((t) => t?.skipped).length < 2;
  if (skipShortcutEligible) return { model, prompt: null };

  const axes = loadAxes();
  const msgs = buildMessages({
    axes,
    focusPoints: args.focusPoints,
    ctx: args.ctx,
    transcript: args.transcript,
    lastQuestion: args.lastQuestion,
    lastAnswer: args.lastAnswer,
    axisState: axisCoverage(args.axisState),
    remainingQueue: args.remainingQueue,
    remainingBudget: args.remainingBudget,
    turnNumber: args.turnNumber,
    totalTurns: args.totalTurns,
    closerAlias: args.closerAlias,
    selectedFocus: args.selectedFocus,
    prep: args.prep,
  });
  return { model, prompt: msgs.filled };
}

export {
  planTurn,
  assemblePlanTurn,
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
  enforceCloserOnFinalTurn,
  enforceBudgetLength,
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
