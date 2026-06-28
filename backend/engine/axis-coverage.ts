// Axis-coverage enforcement: when an axis is going untouched late in a run, slot
// in a REAL question that probes it (promote a queued item, else pull a bank/seed
// question that fits the arc) rather than stamping a fake label. Extracted
// verbatim from queue-manager.ts (Phase 2 repo-tidy).
import { AXIS_IDS } from "./axes.ts";
import { loadDir } from "./questions.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { checkQuestionEligibility, contentTokens, isRepeatOfAsked } from "./question-eligibility.ts";
import { computeRemainingStages } from "./queue-metrics.ts";
import { isRuntimeThreadFollow } from "./thread-follow.ts";
import { MAX_QUEUE } from "./queue-constants.ts";
import { isObjectRecord, asString } from "../shared/guards.ts";
import type { Arc } from "./queue-constants.ts";
import type { Question, QuestionPurpose } from "../shared/question.types.ts";
import type { AxisState, TranscriptEntry } from "../shared/session.types.ts";

// REVIEW: bank/seed candidates load from disk YAML as loosely-typed records
// (loadDir → Record<string, unknown>). The question YAML schema is closed and
// canonical, so a coverage pick is materialised into a Question by narrowing
// its canonical fields here — same fields the original spliced in, just typed.
function bankRecordToQuestion(c: Record<string, unknown>): Question {
  const purposeRaw = c.purpose;
  const purpose: QuestionPurpose =
    purposeRaw === "wellbeing" || purposeRaw === "topic" || purposeRaw === "competency" || purposeRaw === "engagement"
      ? purposeRaw
      : "topic";
  const axisEffects: Record<string, number> = {};
  if (isObjectRecord(c.axis_effects)) {
    for (const [axis, delta] of Object.entries(c.axis_effects)) {
      if (typeof delta === "number") axisEffects[axis] = delta;
    }
  }
  return {
    alias: asString(c.alias),
    label: asString(c.label),
    name: asString(c.name),
    description: asString(c.description),
    purpose,
    stage: typeof c.stage === "string" ? c.stage : null,
    axis_effects: axisEffects,
    source: asString(c.source),
  };
}

// Pool-root artifacts from before runtime questions moved to _runtime: planner
// items and thread-follows saved by past sessions are write-only run records,
// never bank candidates (they carry another conversation's premises). The
// curated pool is source "generated"/seed material only. Load-time filter —
// the YAML files themselves stay where they are.
function isCuratedBankQuestion(q: Record<string, unknown>): boolean {
  const source = String(q?.source || "");
  if (source === "planner_added" || source.startsWith("reworded_from")) return false;
  if (String(q?.alias || "").startsWith("q_thread_follow")) return false;
  return true;
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
}: {
  newQueue: Question[];
  axisState: AxisState;
  turnNumber: number;
  issues: string[];
  askedAliases?: Set<string>;
  askedNames?: string[];
  arc?: Arc | null;
  transcript?: TranscriptEntry[];
  meetingType?: string | null;
  bankLoader?: () => unknown[];
}): Question[] {
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
  const candidates = (bankLoader() || []).filter((c): c is Record<string, unknown> => {
    if (!isObjectRecord(c)) return false;
    if (!c.alias || !c.name) return false;
    if (!isObjectRecord(c.axis_effects) || !c.axis_effects[priority]) return false;
    if (askedAliases.has(String(c.alias)) || queuedAliases.has(String(c.alias))) return false;
    if (c.stage != null && arc && !arcStageIds.has(String(c.stage))) return false;
    if (isRepeatOfAsked(c.name, askedTokenSets)) return false;
    // Relational arcs never pull an evaluative question, even for axis coverage.
    if (c.purpose === "competency" && isRelationalArc(meetingType ?? undefined)) {
      issues.push(`arc gate: coverage skipped ${c.alias} (competency question in relational arc)`);
      return false;
    }
    // REVIEW: the gate takes a {name,label,description,alias} view; bank records
    // are loosely typed, so narrow those fields (asString matches how the gate's
    // own `|| ""` / contentTokens already coerce non-strings).
    const eligibility = checkQuestionEligibility(
      { name: asString(c.name), label: asString(c.label), description: asString(c.description), alias: asString(c.alias) },
      { meetingType: meetingType ?? undefined }
    );
    if (!eligibility.ok) {
      issues.push(
        `eligibility: coverage skipped ${c.alias} (${eligibility.reason}: ${eligibility.matched})`
      );
      return false;
    }
    return true;
  });
  const pick =
    candidates.find((c) => c.stage != null && underServed.has(String(c.stage))) ||
    candidates.find((c) => c.stage == null) ||
    candidates[0];
  if (pick) {
    const queue = [...newQueue];
    queue.splice(insertAt, 0, bankRecordToQuestion(pick));
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

export { enforceAxisCoverage };
