// The scripted full-engine runner: drives one persona through the SAME in-process
// pipeline a live web session uses — start on the scripted lane, role profile,
// focus points, preparation, the frozen scripted question path turn by turn, then
// the final evaluation. Run folders come out identical to live runs, so the
// review screen and Compare read them unchanged.
//
// Every paid engine call arrives injected (deps.engine), so tests prove the whole
// run shape offline. The turn loop deliberately MIRRORS planStream's scripted
// path (session-streams.ts) instead of refactoring it — zero blast radius on the
// live session code; convergence is parked in the plan.

import { logTurn, logRunRoot } from "../../../engine/session.ts";
import * as cost from "../../../engine/cost.ts";
import { applyDeltas, serialize } from "../../../engine/axes.ts";
import { getSessionSelectedFocus } from "../../selected-focus.ts";
import { buildPreparationInputs } from "../sessions/preparation-inputs.ts";
import { formatNotesForEvaluation, stripTesterNoteLines } from "../sessions/notes-format.ts";
import { asString } from "../../../shared/guards.ts";
import type { Session, TranscriptEntry } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";
import type { Briefing } from "../../../shared/briefing.types.ts";
import type { PersonaRunner, RunnerHooks } from "./persona-runs.service.ts";

type StageOpts = { session: { id: string; dir: string } };

// The slice of the planner's result the runner reads (same shape planStream uses).
interface PlanResult {
  assessment: { deltas: Record<string, number>; note: string };
  newQueue: Question[];
  issues?: string[];
  unbooked_signal?: TranscriptEntry["unbooked_signal"];
  prompt?: string | null;
  response?: unknown;
}

export interface PersonaRunnerDeps {
  /** The bench record with display fields + meetingTypeIndex (catalog service shape). */
  catalog: { findPersona(id: string): Record<string, unknown> | null };
  /** The persona's fixed script shaped as engine questions (persona-script.ts). */
  loadScript: (personaId: string) => Question[];
  /** The sessions service slice the runner drives (a QA instance with no pre-warm,
   *  so every paid call below is explicit and single). */
  sessions: {
    start(body: Record<string, unknown>, orgId?: string | null, userId?: string | null): { sessionId: string };
    require(id: string): Session;
    answer(id: string, body: Record<string, unknown>): unknown;
    persist(session: Session): void;
  };
  /** The paid engine boundaries. */
  engine: {
    ensureRoleProfile(ctx: Session["ctx"], opts: StageOpts): Promise<unknown>;
    generateFocusPoints(ctx: Session["ctx"], opts: StageOpts): Promise<NonNullable<Session["focusPointsResult"]>>;
    generatePreparation(
      inputs: ReturnType<typeof buildPreparationInputs>,
      opts: StageOpts
    ): Promise<NonNullable<Session["preparationResult"]>>;
    planTurn(input: Record<string, unknown>): Promise<PlanResult>;
    evaluate(input: unknown, opts: StageOpts): Promise<Briefing>;
  };
  now?: () => number;
}

export function createPersonaRunner(deps: PersonaRunnerDeps): PersonaRunner {
  const now = deps.now ?? Date.now;

  // One scripted turn — a mirror of planStream's `scripted === true` path: keep the
  // planner's scoring, ignore its re-plan (the frozen script IS the path), write the
  // same per-turn files. No back-nav snapshot: QA runs have no Back button.
  async function runScriptedTurn(session: Session): Promise<void> {
    const pending = session.pendingAnswer;
    if (!pending) throw new Error("no pending answer for the scripted turn");
    session.pendingAnswer = null;

    const q = session.queueRef.shift();
    if (!q) throw new Error("no pending question for the scripted turn");
    session.turn += 1;
    const turn = session.turn;

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
      if (!session.focusPointsResult) throw new Error("focus points not ready");
      planResult = await deps.engine.planTurn({
        focusPoints: session.focusPointsResult.focus_points,
        selectedFocus: getSessionSelectedFocus(session),
        ctx: session.ctx,
        transcript: session.transcript,
        lastQuestion: q,
        lastAnswer: pending.text,
        axisState: session.axisState,
        remainingQueue: session.queueRef,
        remainingBudget,
        turnNumber: turn,
        totalTurns: session.totalBudget,
        closerAlias: null, // scripted lane never reserves a closer
        prep: session.preparationResult?.brief || null,
        sessionBank: Array.isArray(session.sessionBank) ? session.sessionBank : [],
      });
    } catch (e) {
      // Same honest fallback as the live path: keep going, say so in the note.
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[persona-run] planner failed:", msg);
      planResult = {
        assessment: { deltas: {}, note: "(planner failed)" },
        newQueue: session.queueRef,
        issues: [msg],
        prompt: "",
        response: "",
      };
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

    // Scripted lane: the planner's re-plan is discarded — queueRef already holds
    // the rest of the frozen script after the shift above.

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
  }

  return async ({ personaId, orgId }, hooks: RunnerHooks) => {
    const bench = deps.catalog.findPersona(personaId);
    if (!bench) throw new Error(`persona not in the bench: ${personaId}`);

    hooks.onProgress({ stageLabel: "Starting session" });
    const { sessionId } = deps.sessions.start(
      {
        name: asString(bench.displayName) || asString(bench.name),
        role: asString(bench.role),
        seniority: asString(bench.seniority),
        meetingTypeIndex: Number(bench.meetingTypeIndex),
        notes: asString(bench.notes),
        mode: "scripted",
        personaId,
        runLabel: "test-engine",
      },
      orgId,
      null // QA runs belong to no person — they never show under "My runs"
    );
    hooks.onSession(sessionId);

    const session = deps.sessions.require(sessionId);
    const stageOpts: StageOpts = { session: { id: session.id, dir: session.dir } };

    // Same tolerance as the live pre-warm: a missing role profile degrades, not dies.
    hooks.onProgress({ stageLabel: "Role profile" });
    await deps.engine.ensureRoleProfile(session.ctx, stageOpts).catch((e: unknown) => {
      console.warn("[persona-run] role profile failed (continuing):", e instanceof Error ? e.message : String(e));
      return null;
    });

    if (!session.focusPointsResult) {
      hooks.onProgress({ stageLabel: "Focus points" });
      session.focusPointsResult = await deps.engine.generateFocusPoints(session.ctx, stageOpts);
    }

    if (!session.preparationResult) {
      hooks.onProgress({ stageLabel: "Preparation" });
      session.preparationResult = await deps.engine.generatePreparation(buildPreparationInputs(session), stageOpts);
    }

    // Freeze the question path to the persona's script — the same branch the web
    // session's bank stage runs on the scripted lane.
    const scripted = deps.loadScript(personaId);
    if (!scripted.length) throw new Error(`persona has no usable script: ${personaId}`);
    session.queueRef = scripted.slice();
    session.totalBudget = scripted.length;
    session.closer = null;
    session.sessionBank = scripted.slice();
    session.bankReady = { count: scripted.length };
    deps.sessions.persist(session);

    // The turn loop: answer from the script (fallback when the script has no line
    // for this question), then run the scripted planner turn.
    while (session.turn < session.totalBudget && session.queueRef.length > 0) {
      const q = session.queueRef[0];
      if (!q) break;
      const scriptedAnswer = session.scriptAnswers?.[q.alias];
      deps.sessions.answer(session.id, {
        answer: scriptedAnswer ?? session.scriptedFallback ?? "",
        alias: q.alias,
        answerSource: scriptedAnswer != null ? "scripted" : "fallback",
      });
      hooks.onProgress({ stageLabel: "Questions", turn: session.turn + 1, total: session.totalBudget });
      await runScriptedTurn(session);
      deps.sessions.persist(session);
    }

    // Final evaluation — the evaluationStream mirror. Lexicon review + rating are
    // deliberately skipped (QA runs have no human in the loop).
    hooks.onProgress({ stageLabel: "Final briefing" });
    const intakeNotes = String(session.ctx?.notes || "").trim();
    const capturedNotes = stripTesterNoteLines(formatNotesForEvaluation(session.notes || []));
    const notesForEvaluation = [intakeNotes, capturedNotes].filter(Boolean).join("\n\n");
    if (!session.focusPointsResult) throw new Error("focus points not ready");
    const result = await deps.engine.evaluate(
      {
        ctx: session.ctx,
        focusPoints: session.focusPointsResult.focus_points,
        selectedFocus: getSessionSelectedFocus(session),
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
      },
      stageOpts
    );

    const summary = session.tracker.summary();
    const completedAt = now();
    session.completedAt = completedAt;
    session.briefing = { ...result, cost: summary, completedAt };
    logRunRoot(session, "cost.json", summary); // cost.json parity with the CLI
    deps.sessions.persist(session);

    return { sessionId, costUsd: summary.usd_total };
  };
}
