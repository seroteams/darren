// Prompt assembly for the plan-turn stage: fill the plan-turn template with the
// run's axes/focus/transcript/arc state and split it into system+user messages.
// Extracted verbatim from queue-manager.ts (Phase 2 repo-tidy).
import fs from "node:fs";
import { getArc } from "./meeting-arcs.ts";
import { promptFor } from "./one-on-one-types/index.ts";
import { resolveSelectedFocus } from "./selected-focus.ts";
import { splitSystemUser } from "./prompt-utils.ts";
import { loadRoleProfile, renderRoleProfileBlock } from "./role-profile.ts";
import {
  computeArcProgress,
  computeConsecutiveDrillCount,
  computeRemainingStages,
  computeLastRealizedDeltas,
  computeConsecutiveWellbeingClarifierCount,
  computeOffArcDrillCount,
} from "./queue-metrics.ts";
import type { Question } from "../shared/question.types.ts";
import type { TranscriptEntry } from "../shared/session.types.ts";

// The meeting context buildMessages reads — a permissive view of MeetingContext.
interface BuildMessagesCtx {
  meetingType: string;
  notes?: string;
  name?: string;
  role?: string;
  seniority?: string;
}

// The slim prep slice the planner reads (coreIssue + listenFor).
interface PlannerPrep {
  coreIssue?: string;
  listenFor?: string[];
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
}: {
  axes: unknown;
  focusPoints: unknown;
  ctx: BuildMessagesCtx;
  transcript: TranscriptEntry[] | null | undefined;
  lastQuestion: Question | null | undefined;
  lastAnswer: string | null | undefined;
  axisState: unknown;
  remainingQueue: Question[] | null | undefined;
  remainingBudget: number | string | null | undefined;
  turnNumber?: number | null;
  totalTurns?: number | null;
  closerAlias: string | null | undefined;
  selectedFocus?: { id?: string } | null;
  prep?: PlannerPrep | null;
}) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "planTurn"), "utf8");
  const arc = getArc(ctx.meetingType);
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes: ctx.notes, focusPoints: Array.isArray(focusPoints) ? focusPoints : undefined });
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
    .replaceAll("{{LAST_QUESTION_JSON}}", JSON.stringify(lastQuestion ? { ...lastQuestion, description: undefined } : lastQuestion, null, 2))
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

export { buildMessages };
export type { BuildMessagesCtx, PlannerPrep };
