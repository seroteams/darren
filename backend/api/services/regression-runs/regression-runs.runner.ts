// The regression rerun runner: drives one frozen case through the SAME in-process
// pipeline a live web session uses, on the DYNAMIC lane — the engine generates its
// own question bank and the planner re-plans freely, turn by turn.
//
// That dynamic lane is the whole point. The scenario freezes only the intake and a
// POSITIONAL list of answers: answer N goes to whatever question N the engine asks
// today. Rename a stage, move an action between stages, rewrite the bank prompt —
// the case still runs, and any change in the OUTPUT is a real signal rather than a
// harness break. (The Test engine's persona lane pins answers to question aliases,
// which is precise and breaks the moment an alias retires. Different job.)
//
// Running out of canned answers is survivable and deliberate: the tail becomes
// skips, exactly as the CLI's stdin pipe has always padded. The board warns when a
// scenario is thin rather than refusing to run it.
//
// Every paid engine call arrives injected (deps.engine), so tests prove the whole
// run shape offline. The turn loop MIRRORS planStream's manual path
// (session-streams.ts ~437-512) rather than refactoring it — same reasoning as
// persona-runs.runner.ts: zero blast radius on live session code. That makes three
// mirrors of this policy now; convergence is parked in the plan, and all three
// carry this note.

import path from "node:path";
import { logTurn, logRunRoot } from "../../../engine/session.ts";
import { PLANNER_FAILED_NOTE } from "../../../engine/run-health.ts";
import { classifyAnswer } from "../../../engine/read-quality.ts";
import * as cost from "../../../engine/cost.ts";
import { applyDeltas, serialize } from "../../../engine/axes.ts";
import { assembleQueueWithPrepOpener, findPrepOpener, pinPrepOpenerEarly } from "../../../engine/question-generator.ts";
import { selectReservedCloser, isForbiddenCloser, pickSeedOverflow } from "../../../engine/closer.ts";
import { summarizeAgenda, buildCarryForwardQuestion, shouldCarryAgendaForward } from "../../../engine/agenda.ts";
import { appendEligibilityLog } from "../../../engine/question-eligibility.ts";
import * as questions from "../../../engine/questions.ts";
import { materializeQuestion } from "../../../engine/intro-queue.ts";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { getSessionSelectedFocus } from "../../selected-focus.ts";
import { buildPreparationInputs } from "../sessions/preparation-inputs.ts";
import type { Session, TranscriptEntry } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";
import type { Briefing } from "../../../shared/briefing.types.ts";
import type { CaseExpect } from "./regression-runs.repo.ts";
import type { JudgeInput, JudgeResult, JudgeRunInput } from "../../../engine/regression-judge.ts";

type StageOpts = { session: { id: string; dir: string } };

interface PlanResult {
  assessment: { deltas: Record<string, number>; note: string; read?: TranscriptEntry["read"] };
  newQueue: Question[];
  issues?: string[];
  unbooked_signal?: TranscriptEntry["unbooked_signal"];
  prompt?: string | null;
  response?: unknown;
}

/** The frozen case as the runner needs it: intake plus positional answers. */
export interface RunnableScenario {
  caseId: string;
  name: string;
  role: string;
  seniority: string;
  meetingType: string;
  managerNotes: string;
  answers: string[];
  kind: string;
  expect: CaseExpect;
}

/** What the trust checks say about a finished rerun, and how that reads vs the baseline. */
export interface RunGrade {
  caseId: string;
  batchId: string;
  expected: CaseExpect;
  actual: { verdict: string; hard_fails: string[]; warnings: string[] };
  /** Hard fails that are NOT in the ratified baseline — the ones that mean something. */
  newHardFails: string[];
  regressed: boolean;
  /** True when the canned answers ran out before the arc did. */
  answersRanOut: boolean;
}

export interface RunnerProgress {
  stageLabel?: string;
  turn?: number;
  total?: number;
}

export interface RunnerHooks {
  onSession(sessionId: string): void;
  onProgress(p: RunnerProgress): void;
}

export type RegressionRunner = (
  input: { caseId: string; batchId: string; orgId: string | null },
  hooks: RunnerHooks
) => Promise<{ sessionId: string | null; costUsd: number | null; grade: RunGrade | null; judge: JudgeResult | null }>;

/** The trust-check boundary: the same deterministic checks scripts/gate.js runs. */
export type TrustCheck = (input: {
  briefing: Briefing;
  transcript: TranscriptEntry[];
  managerNotes: string;
  bankQuestions: Question[];
  focusPoints: unknown;
  meetingType: string;
  ctx: Session["ctx"];
}) => { verdict: string; hard_fails?: string[]; warnings?: string[] };

export interface RegressionRunnerDeps {
  loadScenario: (caseId: string) => RunnableScenario | null;
  sessions: {
    start(body: Record<string, unknown>, orgId?: string | null, userId?: string | null): { sessionId: string };
    require(id: string): Session;
    answer(id: string, body: Record<string, unknown>): unknown;
    persist(session: Session): void;
  };
  engine: {
    ensureRoleProfile(ctx: Session["ctx"], opts: StageOpts): Promise<unknown>;
    generateFocusPoints(ctx: Session["ctx"], opts: StageOpts): Promise<NonNullable<Session["focusPointsResult"]>>;
    generatePreparation(
      inputs: ReturnType<typeof buildPreparationInputs>,
      opts: StageOpts
    ): Promise<NonNullable<Session["preparationResult"]>>;
    generateBank(input: Record<string, unknown>, opts: StageOpts): Promise<Question[]>;
    planTurn(input: Record<string, unknown>): Promise<PlanResult>;
    evaluate(input: unknown, opts: StageOpts): Promise<Briefing>;
  };
  runTrustChecks: TrustCheck;
  /** The AI reviewer. Advisory only: it can never change a trust verdict, and a
   *  failure here must not lose the paid run. */
  judge?: (input: JudgeInput) => Promise<JudgeResult>;
  /** The previous completed rerun of this case, for the head-to-head. Null on a
   *  case's first-ever rerun. */
  loadBaselineRun?: (caseId: string) => Promise<JudgeRunInput | null>;
  /** The run-log funnel. Injected so tests prove the loop without a run store;
   *  production always gets the real dual-write (Postgres + disk echo). */
  log?: {
    turn: typeof logTurn;
    runRoot: typeof logRunRoot;
  };
  now?: () => number;
}

// gate.js's regression rule, kept identical (scripts/gate.js ~162-166): a case has
// regressed if it grew a hard fail the baseline never ratified, OR if its verdict
// got worse. Both directions matter — a check that quietly stops firing is also news.
const RANK: Record<string, number> = { PASS: 0, WARN: 1, FAIL: 2 };

export function judgeAgainstBaseline(
  expect: CaseExpect,
  actual: { verdict: string; hard_fails: string[] }
): { newHardFails: string[]; regressed: boolean } {
  const ratified = new Set(expect.hard_fails || []);
  const newHardFails = (actual.hard_fails || []).filter((f) => !ratified.has(f));
  const worseVerdict = (RANK[actual.verdict] ?? 2) > (RANK[expect.verdict] ?? 0);
  return { newHardFails, regressed: newHardFails.length > 0 || worseVerdict };
}

export function meetingTypeIndexFor(label: string): number {
  return MEETING_TYPES.findIndex((t) => t.label === label);
}

export function createRegressionRunner(deps: RegressionRunnerDeps): RegressionRunner {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? { turn: logTurn, runRoot: logRunRoot };

  // One dynamic turn — the mirror of planStream's manual path. Keeps the planner's
  // scoring AND its re-plan, the prep-opener pin, agenda carry-forward, the closer
  // force-insert and seed overflow. No back-nav snapshot: QA runs have no Back button.
  async function runTurn(session: Session): Promise<void> {
    const pending = session.pendingAnswer;
    if (!pending) throw new Error("no pending answer for the turn");
    session.pendingAnswer = null;

    const q = session.queueRef.shift();
    if (!q) throw new Error("no pending question for the turn");
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
        closerAlias: session.closer?.alias ?? null,
        prep: session.preparationResult?.brief || null,
        sessionBank: Array.isArray(session.sessionBank) ? session.sessionBank : [],
      });
    } catch (e) {
      // Same honest fallback as the live path: keep going, say so in the note.
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[regression-run] planner failed:", msg);
      planResult = {
        assessment: { deltas: {}, note: PLANNER_FAILED_NOTE },
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
    turnEntry.read = planResult.assessment.read ?? classifyAnswer(pending.text, planResult.assessment.note);
    if (planResult.unbooked_signal?.length) turnEntry.unbooked_signal = planResult.unbooked_signal;

    // Adopt the planner's re-plan — the dynamic lane's defining move.
    session.queueRef = planResult.newQueue.slice();

    // Pin the prep opener as the first substantive question until it's asked.
    const asked = new Set(session.transcript.map((t) => t.question.alias));
    session.queueRef = pinPrepOpenerEarly(session.queueRef, session.prepOpener, asked, session.ctx.meetingType);

    // Agenda carry-forward: a real agenda answer becomes the next question and
    // buys a turn. The budget grows, and the answer cursor absorbs it exactly as
    // the CLI's stdin pipe does.
    if (!session.agendaInjected && q.alias === "q_intro_agenda_check" && shouldCarryAgendaForward(pending)) {
      const summary = summarizeAgenda(pending.text);
      session.agendaInput = { raw: pending.text, summary };
      const stageId = session.queueRef[0]?.stage ?? session.introQueue[0]?.stage ?? null;
      session.queueRef.unshift(buildCarryForwardQuestion(summary, stageId));
      session.totalBudget += 1;
      session.agendaInjected = true;
    }

    // Force-insert the reserved closer when the next turn IS the last.
    const closer = session.closer;
    if (
      turn + 1 === session.totalBudget &&
      closer &&
      !asked.has(closer.alias) &&
      !isForbiddenCloser(closer) &&
      session.queueRef[0]?.alias !== closer.alias
    ) {
      session.queueRef = session.queueRef.filter((x) => x.alias !== closer.alias);
      session.queueRef.unshift(closer);
      planResult.issues = [...(planResult.issues || []), `closer force-inserted: ${closer.alias}`];
    }

    // Overflow from _seed if the planner emptied the queue but budget remains.
    if (session.queueRef.length === 0 && turn < session.totalBudget) {
      const seeds = questions.loadDir("_seed").map(materializeQuestion);
      const rejections: NonNullable<Parameters<typeof appendEligibilityLog>[1]> = [];
      const seed = pickSeedOverflow(seeds, asked, {
        meetingType: session.ctx.meetingType,
        askedNames: session.transcript.map((t) => t.question.name),
        rejections,
      });
      if (rejections.length) appendEligibilityLog(path.join(session.dir, "eligibility-log.json"), rejections);
      if (seed) session.queueRef.push(seed);
    }

    log.turn(
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
    log.runRoot(session, "transcript.json", session.transcript);
    log.runRoot(session, "axis-state.json", serialize(session.axisState));
  }

  return async ({ caseId, batchId, orgId }, hooks) => {
    const scenario = deps.loadScenario(caseId);
    if (!scenario) throw new Error(`no case with that id: ${caseId}`);

    const meetingTypeIndex = meetingTypeIndexFor(scenario.meetingType);
    if (meetingTypeIndex < 0) {
      // A renamed meeting type is a real finding, not a crash: say which one.
      throw new Error(`case "${caseId}" wants meeting type "${scenario.meetingType}", which the engine no longer has`);
    }

    hooks.onProgress({ stageLabel: "Starting session" });
    const { sessionId } = deps.sessions.start(
      {
        name: scenario.name,
        role: scenario.role,
        seniority: scenario.seniority,
        meetingTypeIndex,
        notes: scenario.managerNotes,
        // manual, NOT scripted: the engine must plan its own questions.
        runLabel: `regression:${batchId}:${caseId}`,
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
      console.warn("[regression-run] role profile failed (continuing):", e instanceof Error ? e.message : String(e));
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

    // The bank stage, mirroring session-streams' manual branch: the engine picks
    // this session's questions, and the reserved opener/closer are set from them.
    hooks.onProgress({ stageLabel: "Questions" });
    const selectedFocus = getSessionSelectedFocus(session);
    const prep = session.preparationResult?.brief || null;
    const bankItems = await deps.engine.generateBank(
      {
        focusPoints: session.focusPointsResult.focus_points,
        ...session.ctx,
        selectedFocus,
        primaryFocusId: selectedFocus?.id,
        existingQueue: session.introQueue,
        prep,
      },
      stageOpts
    );
    session.queueRef = assembleQueueWithPrepOpener(session.introQueue, bankItems, prep, session.ctx.meetingType);
    session.prepOpener = prep ? findPrepOpener(bankItems) : null;
    session.closer = selectReservedCloser(bankItems, session.ctx.meetingType);

    // The legitimate question pool for THIS session, so the planner's coverage
    // insertion can't surface another session's saved question.
    const seen = new Set<string>();
    session.sessionBank = [];
    for (const item of [...session.queueRef, session.prepOpener, session.closer]) {
      if (item?.alias && !seen.has(item.alias)) {
        seen.add(item.alias);
        session.sessionBank.push(item);
      }
    }
    session.bankReady = { count: bankItems.length };
    deps.sessions.persist(session);

    // The turn loop. Answers are POSITIONAL: the cursor walks the frozen list and
    // pads with "" (a skip) once it runs dry, so a grown arc degrades instead of
    // crashing. Budget growth from agenda carry-forward is absorbed here too.
    let cursor = 0;
    while (session.turn < session.totalBudget && session.queueRef.length > 0) {
      const q = session.queueRef[0];
      if (!q) break;
      const answer = scenario.answers[cursor] ?? "";
      cursor += 1;
      deps.sessions.answer(session.id, { answer, alias: q.alias });
      hooks.onProgress({ stageLabel: "Questions", turn: session.turn + 1, total: session.totalBudget });
      await runTurn(session);
      deps.sessions.persist(session);
    }
    const answersRanOut = cursor > scenario.answers.length;

    hooks.onProgress({ stageLabel: "Final briefing" });
    if (!session.focusPointsResult) throw new Error("focus points not ready");
    // The manager's note is the scenario's, verbatim: mid-run notes do not exist
    // on this lane, so there is nothing to merge and nothing to strip.
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
        notes: String(session.ctx?.notes || "").trim(),
        agenda: {
          summary: session.agendaInput?.summary ?? null,
          covered: session.agendaCovered ?? null,
        },
        prep: session.preparationResult?.brief || null,
      },
      stageOpts
    );

    const summary = session.tracker.summary();
    const completedAt = now();
    session.completedAt = completedAt;
    session.briefing = { ...result, cost: summary, completedAt };
    log.runRoot(session, "cost.json", summary);
    deps.sessions.persist(session);

    // Grade it. A grading failure must not lose the run: the rerun happened and
    // cost money, so record it ungraded rather than throwing the whole thing away.
    let grade: RunGrade | null = null;
    try {
      const checked = deps.runTrustChecks({
        briefing: session.briefing,
        transcript: session.transcript,
        managerNotes: scenario.managerNotes,
        bankQuestions: Array.isArray(session.sessionBank) ? session.sessionBank : [],
        focusPoints: session.focusPointsResult.focus_points,
        meetingType: session.ctx.meetingType,
        ctx: session.ctx,
      });
      const actual = {
        verdict: String(checked.verdict || ""),
        hard_fails: checked.hard_fails || [],
        warnings: checked.warnings || [],
      };
      grade = {
        caseId,
        batchId,
        expected: scenario.expect,
        actual,
        ...judgeAgainstBaseline(scenario.expect, actual),
        answersRanOut,
      };
      log.runRoot(session, "trust-checks.json", grade);
    } catch (e) {
      console.warn("[regression-run] trust checks failed:", e instanceof Error ? e.message : String(e));
    }

    // The AI reviewer. Runs AFTER grading so it can see the safety verdict, and
    // is wrapped so a judge failure costs the run nothing: an ungraded rerun is
    // still a rerun, and the money is already spent. Same tolerance gate.js gives
    // its own judge.
    let judged: JudgeResult | null = null;
    if (deps.judge) {
      hooks.onProgress({ stageLabel: "Reviewing" });
      try {
        const baseline = deps.loadBaselineRun ? await deps.loadBaselineRun(caseId) : null;
        judged = await deps.judge({
          scenario: {
            name: scenario.name,
            role: scenario.role,
            seniority: scenario.seniority,
            meetingType: scenario.meetingType,
            managerNotes: scenario.managerNotes,
          },
          current: {
            transcript: session.transcript.map((t) => ({
              question: t.question.name,
              answer: t.answer,
              skipped: t.skipped,
            })),
            briefing: result,
            trust: grade ? { verdict: grade.actual.verdict, hard_fails: grade.actual.hard_fails } : null,
          },
          baseline,
        });
        log.runRoot(session, "judge.json", judged);
      } catch (e) {
        console.warn("[regression-run] AI reviewer failed:", e instanceof Error ? e.message : String(e));
        log.runRoot(session, "judge.json", { unavailable: true });
      }
      // The judge's own spend lands in the same tracker, so re-read the total.
      const withJudge = session.tracker.summary();
      session.briefing = { ...session.briefing, cost: withJudge };
      log.runRoot(session, "cost.json", withJudge);
      deps.sessions.persist(session);
      return { sessionId, costUsd: withJudge.usd_total, grade, judge: judged };
    }

    return { sessionId, costUsd: summary.usd_total, grade, judge: null };
  };
}
