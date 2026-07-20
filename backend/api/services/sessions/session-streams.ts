// SSE stream handlers for a session's live pipeline (focus-points, preparation,
// bank, evaluation, plan). These manage their own response (no v1Route, like
// library); the shared runStage drives idempotent replay + the model call. The
// session is resolved through the same seam as the controller (service.require →
// 404 before the stream opens). Split out of sessions.controller.ts (repo-tidy
// Phase 3) verbatim — behaviour unchanged; only the shared wiring is imported.

import fs from "node:fs";
import path from "node:path";
import type { RequestContext } from "../../router.ts";
import { service, IS_DEV, sessionId, callerFence } from "./session-runtime.ts";
import { generateFocusPoints } from "../../../engine/generate.ts";
import { PLANNER_FAILED_NOTE, scoringFromTranscript } from "../../../engine/run-health.ts";
import { focusHistoryFor } from "../../../engine/focus-history.ts";
import { prepHistoryFor } from "../../../engine/prep-history.ts";
import { generatePreparation } from "../../../engine/preparation.ts";
import { generateSuggestions, shouldReview } from "../../../engine/lexicon-reviewer.ts";
import { generateBankWithFallback, assembleQueueWithPrepOpener, findPrepOpener, pinPrepOpenerEarly } from "../../../engine/question-generator.ts";
import { selectReservedCloser, isForbiddenCloser, pickSeedOverflow } from "../../../engine/closer.ts";
import { evaluate } from "../../../engine/reviewer.ts";
import { applyDeltas, serialize } from "../../../engine/axes.ts";
import { planTurn } from "../../../engine/queue-manager.ts";
import { classifyAnswer } from "../../../engine/read-quality.ts";
import { appendEligibilityLog } from "../../../engine/question-eligibility.ts";
import { summarizeAgenda, buildCarryForwardQuestion } from "../../../engine/agenda.ts";
import * as questions from "../../../engine/questions.ts";
import { materializeQuestion } from "../../../engine/intro-queue.ts";
import { logTurn, logRunRoot } from "../../../engine/session.ts";
import * as cost from "../../../engine/cost.ts";
import { getSessionSelectedFocus } from "../../selected-focus.ts";
import { loadPersona, scriptedQuestions } from "../../persona-script.ts";
import { runStage, abortStage } from "../../handlers/stream-helper.ts";
import { openStream } from "../../sse.ts";
import { summarizeAxes } from "./session-views.ts";
import { buildPreparationInputs } from "./preparation-inputs.ts";
import { formatNotesForEvaluation, stripTesterNoteLines } from "./notes-format.ts";
import { finalizeBriefing } from "./finalize-briefing.ts";
import type { Session, TranscriptEntry } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";
import { isObjectRecord } from "../../../shared/guards.ts";

// GET /api/v1/sessions/:id/focus-points/stream  ·  GET /api/focus-points/stream?s=<id>
export async function focusPointsStream(c: RequestContext): Promise<void> {
  const { orgId, userId } = await callerFence(c);
  const session = service.require(sessionId(c), orgId, userId);
  const force = c.query.regenerate === "1" || c.query.regenerate === "true";
  if (force) {
    session.focusPointsResult = null;
    // Throw away the in-flight run — but tell anyone already waiting on it
    // first. Dropping it silently strands every attached screen forever.
    abortStage(session, "focus-points", "Suggesting different topics — start again from this step.");
  }

  await runStage(c, session, "focus-points", {
    thinkingLabel: "Choosing focus points",
    getCached: () => session.focusPointsResult,
    setCached: (r) => {
      session.focusPointsResult = r;
      // Persist immediately — suggested topics count as focus history even if
      // the manager stops at the focus screen (Carl's call 2026-07-11).
      service.persist(session);
    },
    produce: async () =>
      generateFocusPoints(
        {
          ...session.ctx,
          focusHistory: await focusHistoryFor({ orgId: session.orgId, userId: session.userId, personId: session.personId, excludeId: session.id }),
        },
        { session: { id: session.id, dir: session.dir } }
      ),
    resultEvent: "result",
    buildPayload: (r) => ({ meeting_type: r.meeting_type, focus_points: r.focus_points }),
  });
}

// GET /api/v1/sessions/:id/preparation/stream  ·  GET /api/preparation/stream?s=<id>
export async function preparationStream(c: RequestContext): Promise<void> {
  const { orgId, userId } = await callerFence(c);
  const session = service.require(sessionId(c), orgId, userId);
  // Pre-check the prerequisite before opening the stream (kept verbatim from the
  // legacy handler — the runStage produce re-guards via buildPreparationInputs).
  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("Focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "preparation", {
    thinkingLabel: "Preparing your briefing",
    getCached: () => session.preparationResult,
    setCached: (r) => { session.preparationResult = r; },
    produce: async () => generatePreparation(
      {
        ...buildPreparationInputs(session),
        // Prep freshness (better-reads P3): last brief for this manager+person,
        // arc-fenced; null (→ first-prep sentinel) for guests/unlinked runs.
        prepHistory: await prepHistoryFor(
          { orgId: session.orgId, userId: session.userId, personId: session.personId, excludeId: session.id },
          session.ctx.meetingType,
        ),
      },
      { session: { id: session.id, dir: session.dir } }
    ),
    resultEvent: "result",
    buildPayload: (r) => IS_DEV
      ? { brief: r.brief, runId: r.runId, validation: r.validation }
      : { brief: r.brief, runId: r.runId },
  });
}

// GET /api/v1/sessions/:id/bank/stream  ·  GET /api/bank/stream?s=<id>
export async function bankStream(c: RequestContext): Promise<void> {
  const { orgId, userId } = await callerFence(c);
  const session = service.require(sessionId(c), orgId, userId);
  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "bank", {
    thinkingLabel: session.mode === "scripted" ? "Loading scripted question path" : "Generating question bank",
    getCached: () => (session.bankReady ? { count: session.bankReady.count } : null),
    setCached: (payload) => {
      session.bankReady = payload;
    },
    produce: async () => {
      // Scripted test lane: freeze the question path. Skip live bank generation
      // and load the persona's fixed script as the entire queue, so the only
      // variable between runs is the prompt stage under test. No closer to
      // force-insert — the script defines the exact, ordered path.
      if (session.mode === "scripted") {
        const persona = loadPersona(session.fingerprint?.personaId);
        const scripted = persona ? scriptedQuestions(persona) : [];
        if (scripted.length) {
          session.queueRef = scripted;
          session.totalBudget = scripted.length;
          session.closer = null;
          session.sessionBank = scripted;
          return { count: scripted.length };
        }
      }

      // Guaranteed non-null by the handler's pre-check above; narrowed here for
      // the produce closure (TS can't carry the guard across the callback).
      const focusResult = session.focusPointsResult;
      if (!focusResult) {
        throw Object.assign(new Error("focus points not ready"), { status: 409 });
      }

      const selectedFocus = getSessionSelectedFocus(session);
      const prep = session.preparationResult?.brief || null;
      const bankItems = await generateBankWithFallback(
        {
          focusPoints: focusResult.focus_points,
          ...session.ctx,
          selectedFocus,
          primaryFocusId: selectedFocus?.id,
          existingQueue: session.introQueue,
          prep,
        },
        { session: { id: session.id, dir: session.dir } },
        { onFallback: (e: unknown) => console.warn("[bank] generation failed, falling back to _seed:", e instanceof Error ? e.message : String(e)) }
      );
      session.queueRef = assembleQueueWithPrepOpener(session.introQueue, bankItems, prep, session.ctx.meetingType);
      session.prepOpener = prep ? findPrepOpener(bankItems) : null;

      // Reserve the closer: last bank item tagged with the arc's final stage.
      // plan.js force-inserts this at queueRef[0] when turn + 1 === totalBudget,
      // so the planner can't accidentally drop or rewrite it.
      session.closer = selectReservedCloser(bankItems, session.ctx.meetingType);

      // The legitimate question pool for THIS session (mirrors the CLI loop):
      // assembled queue + reserved prep-opener and closer. The planner's
      // coverage insertion pulls from here instead of the whole global bank,
      // so it can't surface another persona's saved question.
      const seenBankAliases = new Set<string>();
      session.sessionBank = [];
      for (const item of [...session.queueRef, session.prepOpener, session.closer]) {
        if (item?.alias && !seenBankAliases.has(item.alias)) {
          seenBankAliases.add(item.alias);
          session.sessionBank.push(item);
        }
      }

      return { count: bankItems.length };
    },
    resultEvent: "ready",
    buildPayload: (r) => ({ count: r.count }),
  });
}

// Fire-and-forget: kick the per-session lexicon review once the briefing lands
// (only when the session is in scope). Moved verbatim from the deleted handler.
function kickLexiconReview(session: Session): void {
  if (!shouldReview(session.ctx)) return;
  generateSuggestions({ session, ctx: session.ctx }).catch((e: unknown) => {
    console.warn("[evaluation] lexicon review failed:", e instanceof Error ? e.message : String(e));
  });
}

// GET /api/v1/sessions/:id/evaluation/stream  ·  GET /api/evaluation/stream?s=<id>
export async function evaluationStream(c: RequestContext): Promise<void> {
  const { orgId, userId } = await callerFence(c);
  const session = service.require(sessionId(c), orgId, userId);
  const intakeNotes = String(session.ctx?.notes || "").trim();
  // Drop timestamped mid-run tester/observation lines before they reach the manager-notes
  // channel (run-qa-fixes C1) — genuine intake notes have no [HH:MM] stamp and survive.
  const capturedNotes = stripTesterNoteLines(formatNotesForEvaluation(session.notes || []));
  const notesForEvaluation = [intakeNotes, capturedNotes].filter(Boolean).join("\n\n");

  await runStage(c, session, "evaluation", {
    thinkingLabel: "Final evaluation",
    getCached: () => session.briefing,
    // Persist on completion (live-test 2026-07-13): evaluation is the last stage,
    // so the finished flag (finished = Boolean(briefing)) only lands if we persist
    // here — otherwise the completed run vanishes from the manager's finished list
    // and the member's about-me until a later write. Mirrors focusPointsStream.
    setCached: (r) => finalizeBriefing(session, r, { persist: (s) => service.persist(s), kickReview: kickLexiconReview }),
    produce: () => {
      // Evaluation is the last stage, so focus points are always present; narrow
      // here for the produce closure (TS can't carry it in) — the original read
      // session.focusPointsResult.focus_points directly and would throw if absent.
      const focusResult = session.focusPointsResult;
      if (!focusResult) {
        throw Object.assign(new Error("focus points not ready"), { status: 409 });
      }
      const selectedFocus = getSessionSelectedFocus(session);
      return evaluate(
        {
          ctx: session.ctx,
          focusPoints: focusResult.focus_points,
          selectedFocus,
          transcript: session.transcript.map((t) => ({
            question: t.question.name,
            alias: t.question.alias,
            stage: t.question.stage,
            answer: t.answer,
            skipped: t.skipped,
            unbooked_signal: t.unbooked_signal || [],
          })),
          axisState: serialize(session.axisState),
          notes: notesForEvaluation,
          agenda: {
            summary: session.agendaInput?.summary ?? null,
            covered: session.agendaCovered ?? null,
          },
          // Scoring health: if the per-turn planner failed on any scored turn, the
          // briefing must lead with low confidence. The CLI tallies this inline; the
          // live path has no running counter, so we rebuild it from the transcript
          // here — without it the reviewer always heard "OK" and a run on broken
          // scores still read as fully confident.
          scoring: scoringFromTranscript(session.transcript),
          // Promises loop phase 3: what the manager tapped at card zero about last
          // time's promises — so the briefing acknowledges follow-through and rolls
          // any unfinished promise into next_actions.
          priorCheckin: session.priorCheckin ?? null,
        },
        { session: { id: session.id, dir: session.dir } }
      );
    },
    resultEvent: "briefing",
    buildPayload: (r) => session.briefing || r,
  });
}

// --- plan stream (S4, the planner). No runStage: it manages its own SSE with
// idempotent per-turn replay, the back-navigation snapshot, agenda carry-forward,
// closer force-insert and seed overflow. Moved verbatim from handlers/plan.ts; only
// session-resolution changed (service.require / service.persist via the seam).

// What we cache per turn for idempotent replay (set at the end of planStream).
interface CachedPlan {
  axes: ReturnType<typeof summarizeAxes>;
  issues?: string[];
  note: string;
  terminal: string;
  thinkingLabel: string;
}
function isCachedPlan(v: unknown): v is CachedPlan {
  return isObjectRecord(v) && typeof v.terminal === "string" && typeof v.thinkingLabel === "string";
}

// The slice of the planner's result this stream reads. Both planTurn's return and
// the planner-failed fallback satisfy it.
interface PlanResult {
  assessment: { deltas: Record<string, number>; note: string; read?: TranscriptEntry["read"] };
  newQueue: Question[];
  issues?: string[];
  unbooked_signal?: TranscriptEntry["unbooked_signal"];
  prompt?: string | null;
  response?: unknown;
}

// GET /api/v1/sessions/:id/plan/stream  ·  GET /api/plan/stream?s=<id>
export async function planStream(c: RequestContext): Promise<void> {
  const { orgId, userId } = await callerFence(c);
  const session = service.require(sessionId(c), orgId, userId);
  const stream = openStream(c.res);

  // --- Idempotent replay of an already-completed turn
  const turnForStream = session.turn + (session.pendingAnswer ? 1 : 0);
  const cached = session.lastPlanByTurn.get(turnForStream);
  if (isCachedPlan(cached)) {
    stream.write("thinking", { label: cached.thinkingLabel });
    setTimeout(() => {
      stream.write("axes", { axes: cached.axes, issues: cached.issues });
      if (cached.note) stream.write("note", { note: cached.note });
      stream.write(cached.terminal, {});
      stream.close();
    }, 250);
    return;
  }

  if (!session.pendingAnswer) {
    stream.write("error", { message: "no pending answer", recoverable: false });
    stream.close();
    return;
  }

  const pending = session.pendingAnswer;

  // Back-navigation snapshot: capture the turn-affecting state BEFORE this turn
  // mutates it, so POST /api/back can restore the previous question for an amend.
  // Taken only on the real planning path (not the idempotent replay above).
  const clone = <T>(x: T): T => (x == null ? x : JSON.parse(JSON.stringify(x)));
  (session.turnSnapshots ||= []).push({
    appliedTurn: session.turn + 1,
    turn: session.turn,
    totalBudget: session.totalBudget,
    queueRef: clone(session.queueRef),
    axisState: clone(session.axisState),
    transcript: clone(session.transcript),
    agendaInjected: session.agendaInjected,
    agendaInput: clone(session.agendaInput),
    question: clone(session.queueRef[0]) ?? null,
    answerText: pending.raw,
  });

  session.pendingAnswer = null;

  const q = session.queueRef.shift();
  if (!q) {
    stream.write("error", { message: "no pending question", recoverable: false });
    stream.close();
    return;
  }
  session.turn += 1;
  const turn = session.turn;

  const thinkingLabel = pending.skipped
    ? "Recording skip & re-planning queue"
    : "Scoring answer & re-planning queue";
  stream.write("thinking", { label: thinkingLabel });

  // Mirror backend/cli.ts: push turn into transcript BEFORE planning
  const turnEntry: TranscriptEntry = {
    turn,
    question: q,
    answer: pending.text,
    skipped: pending.skipped,
  };
  session.transcript.push(turnEntry);

  const remainingBudget = Math.max(0, session.totalBudget - turn);

  let planResult!: PlanResult;
  // The plan turn runs inside this run's own cost context (audit F7) — race-free spend
  // attribution and ceiling enforcement even when several managers prep at once.
  await cost.runWithTracker(session.tracker, async () => {
  try {
    const selectedFocus = getSessionSelectedFocus(session);
    // Original engine accessed focusPointsResult.focus_points directly: a null
    // result threw here and fell into the catch below (free "(planner failed)"
    // fallback, no model call). Keep that — optional chaining would instead run
    // a live (paid) plan with focusPoints=undefined. Throw stays inside the try.
    if (!session.focusPointsResult) throw new Error("focus points not ready");
    planResult = await planTurn({
      focusPoints: session.focusPointsResult.focus_points,
      selectedFocus,
      ctx: session.ctx,
      transcript: session.transcript,
      lastQuestion: q,
      lastAnswer: pending.text,
      axisState: session.axisState,
      remainingQueue: session.queueRef,
      remainingBudget,
      turnNumber: turn,
      totalTurns: session.totalBudget,
      closerAlias: session.closer ? session.closer.alias : null,
      prep: session.preparationResult?.brief || null,
      // Always an array: a session without a bank (e.g. rehydrated from before
      // sessionBank existed) gets "seeds only" — never the global-bank fallback.
      sessionBank: Array.isArray(session.sessionBank) ? session.sessionBank : [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[plan] planner failed:", msg);
    planResult = {
      assessment: { deltas: {}, note: PLANNER_FAILED_NOTE },
      newQueue: session.queueRef,
      issues: [msg],
      prompt: "",
      response: "",
    };
    stream.write("note", { note: "The model hiccuped — continuing." });
  }
  });

  applyDeltas(session.axisState, {
    questionAlias: q.alias,
    answerExcerpt: pending.text,
    deltas: planResult.assessment.deltas,
  });

  turnEntry.realized_deltas = planResult.assessment.deltas;
  turnEntry.note = planResult.assessment.note;
  turnEntry.read = planResult.assessment.read ?? classifyAnswer(pending.text, planResult.assessment.note);
  if (planResult.unbooked_signal?.length) turnEntry.unbooked_signal = planResult.unbooked_signal;

  // Scripted test lane: keep the planner's scoring (deltas + note) but ignore its
  // re-plan, agenda carry-forward, closer force-insert and seed overflow — the
  // fixed script (already shifted at the top of this turn) IS the path, so the
  // questions stay identical across runs. Manual mode keeps all dynamic behaviour.
  const scripted = session.mode === "scripted";

  if (!scripted) session.queueRef = planResult.newQueue.slice();

  // Pin the prep opener as the first substantive question until it's asked — the
  // planner re-plans freely and would otherwise bury it. Scripted runs keep their
  // frozen path.
  if (!scripted) {
    const askedAliases = new Set(session.transcript.map((t) => t.question.alias));
    session.queueRef = pinPrepOpenerEarly(
      session.queueRef,
      session.prepOpener,
      askedAliases,
      session.ctx.meetingType
    );
  }

  // Agenda carry-forward: when the agenda-check answer is real, re-ask it as
  // the immediate next question so the topic the report raised can't be dropped.
  if (
    !scripted &&
    !session.agendaInjected &&
    q.alias === "q_intro_agenda_check" &&
    !pending.skipped &&
    pending.text.trim()
  ) {
    const summary = summarizeAgenda(pending.text);
    session.agendaInput = { raw: pending.text, summary };
    const stageId = session.queueRef[0]?.stage ?? session.introQueue[0]?.stage ?? null;
    session.queueRef.unshift(buildCarryForwardQuestion(summary, stageId));
    session.totalBudget += 1;
    session.agendaInjected = true;
  }

  // Force-insert the reserved closer when the next turn IS the last.
  // The planner gets veto-proof: regardless of what it returned, the closer runs last.
  const askedAliases = new Set(session.transcript.map((t) => t.question.alias));
  const closer = session.closer;
  if (
    !scripted &&
    turn + 1 === session.totalBudget &&
    closer &&
    !askedAliases.has(closer.alias) &&
    !isForbiddenCloser(closer)
  ) {
    if (session.queueRef[0]?.alias !== closer.alias) {
      session.queueRef = session.queueRef.filter((x) => x.alias !== closer.alias);
      session.queueRef.unshift(closer);
      planResult.issues = [
        ...(planResult.issues || []),
        `closer force-inserted: ${closer.alias}`,
      ];
    }
  }

  // Overflow from _seed if planner emptied the queue but we still have budget
  if (!scripted && session.queueRef.length === 0 && turn < session.totalBudget) {
    const seeds = questions.loadDir("_seed").map(materializeQuestion);
    const seen = new Set(session.transcript.map((t) => t.question.alias));
    const rejections: NonNullable<Parameters<typeof appendEligibilityLog>[1]> = [];
    const seed = pickSeedOverflow(seeds, seen, {
      meetingType: session.ctx.meetingType,
      askedNames: session.transcript.map((t) => t.question.name),
      rejections,
    });
    if (rejections.length) {
      appendEligibilityLog(path.join(session.dir, "eligibility-log.json"), rejections);
    }
    if (seed) session.queueRef.push(seed);
    // No eligible seed → terminal goes "done" below and the session closes
    // into evaluation as normal; never serve a bad question to fill time.
  }

  const axes = summarizeAxes(session.axisState);
  // In scripted mode the planner's queue complaints (thread-follow injects, ref
  // not in queue) are moot — its re-plan is discarded — so don't surface them.
  const issues = !scripted && planResult.issues?.length ? planResult.issues : undefined;
  stream.write("axes", { axes, issues });
  if (planResult.assessment.note) {
    stream.write("note", { note: planResult.assessment.note });
  }

  // Turn + run-root logs through the dual-write funnel (postgres-runtime-data
  // Phase 3): DB always, disk only when the file echo is on. The prompt/raw pair
  // rides along so live and CLI logs stay identical for the stage I/O view.
  logTurn(
    session,
    turn,
    {
      turn,
      question: q,
      answer: pending.text,
      skipped: pending.skipped,
      assessment: planResult.assessment,
      new_queue: session.queueRef.map((x) => ({ alias: x.alias, label: x.label, name: x.name })),
      issues: planResult.issues || [],
      unbooked_signal: planResult.unbooked_signal || [],
      axis_state: serialize(session.axisState),
    },
    planResult.prompt ? { prompt: planResult.prompt, response: planResult.response } : undefined
  );
  logRunRoot(session, "transcript.json", session.transcript);
  logRunRoot(session, "axis-state.json", serialize(session.axisState));

  const terminal =
    turn >= session.totalBudget || session.queueRef.length === 0 ? "done" : "next";
  stream.write(terminal, {});

  session.lastPlanByTurn.set(turn, {
    axes,
    issues,
    note: planResult.assessment.note,
    terminal,
    thinkingLabel,
  });

  service.persist(session);
  stream.close();
}
