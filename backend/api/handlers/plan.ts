import fs from "node:fs";
import path from "node:path";
import { requireSession, summarizeAxes, persistSession } from "../sessions.ts";
import { openStream } from "../sse.ts";
import { planTurn } from "../../engine/queue-manager.ts";
import { applyDeltas, serialize } from "../../engine/axes.ts";
import { isForbiddenCloser, pickSeedOverflow } from "../../engine/closer.ts";
import { appendEligibilityLog } from "../../engine/question-eligibility.ts";
import { pinPrepOpenerEarly } from "../../engine/question-generator.ts";
import { summarizeAgenda, buildCarryForwardQuestion } from "../../engine/agenda.ts";
import * as questions from "../../engine/questions.ts";
import { materializeQuestion } from "../../engine/intro-queue.ts";
import { writeJson } from "../../engine/cli/io.ts";
import * as cost from "../../engine/cost.ts";
import { getSessionSelectedFocus } from "../selected-focus.ts";
import type { RequestContext } from "../router.ts";
import type { Question } from "../../shared/question.types.ts";
import type { TranscriptEntry } from "../../shared/session.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

// What we cache per turn for idempotent replay (set at the end of this handler).
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

// The slice of the planner's result this handler reads. Both planTurn's return
// and the planner-failed fallback satisfy it.
interface PlanResult {
  assessment: { deltas: Record<string, number>; note: string };
  newQueue: Question[];
  issues?: string[];
  unbooked_signal?: TranscriptEntry["unbooked_signal"];
  prompt?: string | null;
  response?: unknown;
}

export default async function plan(c: RequestContext): Promise<void> {
  const session = requireSession(c.query.s ?? "");
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

  // Mirror cli.js: push turn into transcript BEFORE planning
  const turnEntry: TranscriptEntry = {
    turn,
    question: q,
    answer: pending.text,
    skipped: pending.skipped,
  };
  session.transcript.push(turnEntry);

  const remainingBudget = Math.max(0, session.totalBudget - turn);

  let planResult: PlanResult;
  const prevTracker = cost.getActive();
  cost.setActive(session.tracker);
  try {
    const selectedFocus = getSessionSelectedFocus(session);
    planResult = await planTurn({
      focusPoints: session.focusPointsResult?.focus_points,
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
      assessment: { deltas: {}, note: "(planner failed)" },
      newQueue: session.queueRef,
      issues: [msg],
      prompt: "",
      response: "",
    };
    stream.write("note", { note: "The model hiccuped — continuing." });
  } finally {
    cost.setActive(prevTracker);
  }

  applyDeltas(session.axisState, {
    questionAlias: q.alias,
    answerExcerpt: pending.text,
    deltas: planResult.assessment.deltas,
  });

  turnEntry.realized_deltas = planResult.assessment.deltas;
  turnEntry.note = planResult.assessment.note;
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

  // Filesystem logs (mirror cli.js)
  const dynamicAnswersDir = path.join(session.dir, "04-dynamic-answers");
  writeJson(
    path.join(dynamicAnswersDir, `${String(turn).padStart(2, "0")}-turn.json`),
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
    }
  );
  // Mirror the CLI loop: keep the exact prompt sent to the planner and its raw
  // reply alongside the turn file, so live and CLI logs are identical and the
  // stage I/O view can show what each Q&A turn fed the model.
  if (planResult.prompt) {
    const pad = String(turn).padStart(2, "0");
    fs.writeFileSync(path.join(dynamicAnswersDir, `${pad}-prompt.md`), planResult.prompt);
    fs.writeFileSync(
      path.join(dynamicAnswersDir, `${pad}-response.json`),
      typeof planResult.response === "string" ? planResult.response : JSON.stringify(planResult.response, null, 2)
    );
  }
  writeJson(path.join(session.dir, "transcript.json"), session.transcript);
  writeJson(path.join(session.dir, "axis-state.json"), serialize(session.axisState));

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

  persistSession(session);
  stream.close();
}
