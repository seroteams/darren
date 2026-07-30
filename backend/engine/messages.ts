// Prompt assembly for the plan-turn stage: fill the plan-turn template with the
// run's axes/focus/transcript/arc state and split it into system+user messages.
// Extracted verbatim from queue-manager.ts (Phase 2 repo-tidy).
import fs from "node:fs";
import { getArc } from "./meeting-arcs.ts";
import { promptFor } from "./one-on-one-types/index.ts";
import { resolveSelectedFocus } from "./selected-focus.ts";
import { splitSystemUser } from "./prompt-utils.ts";
import { loadRoleProfile, renderRoleProfileBlock } from "./role-profile.ts";
import { loadLexicon, renderPreferTerms, renderPreferPhrases, renderAvoidPhrases } from "./lexicon.ts";
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

// A mid-run note as the planner sees it (a permissive view of SessionNote).
interface PlannerSessionNote {
  text?: string;
  turn?: number | null;
}

// Living plan (no dead wires P3): the last three mid-run notes, one line each,
// capped so the per-turn (uncached) half of the prompt stays small.
function renderSessionNotes(notes: PlannerSessionNote[] | null | undefined): string {
  const rows = (notes || []).filter((n) => String(n?.text || "").trim()).slice(-3);
  if (!rows.length) return "(none yet)";
  return rows
    .map((n) => {
      const text = String(n.text).replace(/\s+/g, " ").trim().slice(0, 160);
      const where = n.turn ? ` (at Q${n.turn})` : "";
      return `- Manager noted${where}: ${text}`;
    })
    .join("\n");
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
  sessionNotes = null,
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
  sessionNotes?: PlannerSessionNote[] | null;
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
    // How the answer read (note|thin|decline|skip) — drives planning rule 15.
    // Undefined on pre-tag recordings; JSON.stringify drops the key (replay-safe).
    read: t.read,
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
  // Per-run constants — these land inside the cached prompt prefix
  // (session_context), so they are near-free after turn 1. Nothing here may
  // vary turn to turn (see messages.test.ts prefix-stability).
  const lexicon = loadLexicon({ meetingType: ctx.meetingType, role: ctx.role, seniority: ctx.seniority });
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes))
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints))
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}))
    .replaceAll("{{PRIMARY_FOCUS_ID}}", sf?.id || "(none)")
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{ROLE}}", ctx.role || "(not provided)")
    .replaceAll("{{SENIORITY}}", ctx.seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
    .replaceAll("{{MANAGER_NOTES}}", ctx.notes?.trim() ? ctx.notes.trim() : "(none)")
    .replaceAll("{{CONVERSATION_PREFER_TERMS}}", renderPreferTerms(lexicon.preferTerms))
    .replaceAll("{{CONVERSATION_PREFER_PHRASES}}", renderPreferPhrases(lexicon.preferPhrases))
    .replaceAll("{{CONVERSATION_AVOID_PHRASES}}", renderAvoidPhrases(lexicon.avoidPhrases))
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcriptSummary))
    .replaceAll("{{LAST_QUESTION_JSON}}", JSON.stringify(lastQuestion ? { ...lastQuestion, description: undefined } : lastQuestion))
    .replaceAll("{{LAST_ANSWER}}", lastAnswer || "(skipped)")
    .replaceAll("{{SESSION_NOTES}}", renderSessionNotes(sessionNotes))
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState))
    .replaceAll("{{REMAINING_QUEUE_JSON}}", JSON.stringify(queueSummary))
    .replaceAll("{{REMAINING_BUDGET}}", String(remainingBudget))
    .replaceAll("{{TURN_NUMBER}}", String(turnNumber ?? "?"))
    .replaceAll("{{TOTAL_TURNS}}", String(totalTurns ?? "?"))
    .replaceAll("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc))
    .replaceAll("{{TONE_REGISTER}}", arc.tone_register)
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns))
    .replaceAll("{{CURRENT_STAGE_HINT}}", currentStageHint)
    .replaceAll("{{ARC_PROGRESS_JSON}}", JSON.stringify(arcProgress))
    .replaceAll("{{CONSECUTIVE_DRILL_COUNT}}", String(consecutiveDrillCount))
    .replaceAll("{{REMAINING_STAGES_JSON}}", JSON.stringify(remainingStages))
    .replaceAll("{{LAST_REALIZED_DELTAS_JSON}}", JSON.stringify(lastRealizedDeltas))
    .replaceAll("{{CONSECUTIVE_WELLBEING_CLARIFIER_COUNT}}", String(consecutiveWellbeingClarifierCount))
    .replaceAll("{{OFF_ARC_DRILL_COUNT}}", String(offArcDrillCount))
    .replaceAll("{{IS_FINAL_TURN}}", isFinalTurn ? "true" : "false")
    .replaceAll("{{CLOSER_ALIAS}}", closerAlias || "(none)")
    .replaceAll("{{PREP_CORE_ISSUE}}", prep?.coreIssue?.trim() ? prep.coreIssue.trim() : "(none)")
    .replaceAll(
      "{{PREP_LISTEN_FOR_JSON}}",
      Array.isArray(prep?.listenFor) && prep.listenFor.length
        ? JSON.stringify(prep.listenFor)
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

export { buildMessages, renderSessionNotes };
export type { BuildMessagesCtx, PlannerPrep, PlannerSessionNote };
