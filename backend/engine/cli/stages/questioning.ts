import fs from "node:fs";
import path from "node:path";

import { loadDir } from "../../questions.ts";
import { planTurn } from "../../queue-manager.ts";
import { pinPrepOpenerEarly, seedToQuestion } from "../../question-generator.ts";
import { isForbiddenCloser, pickSeedOverflow } from "../../closer.ts";
import { dropIneligibleHeads, appendEligibilityLog } from "../../question-eligibility.ts";
import { initState, applyDeltas, summarize, serialize } from "../../axes.ts";
import * as cost from "../../cost.ts";
import { writeJson, sessionFile, isSkip } from "../io.ts";
import {
  bold,
  dim,
  cyan,
  magentaBold,
  gray,
  red,
  HR,
  renderAxisLine,
  renderQueuePos,
  renderDebugLine,
  withThinking,
} from "../../ui.ts";

import type { Question } from "../../../shared/question.types.ts";
import type { MeetingContext, AxisState, TranscriptEntry, PreparationResult } from "../../../shared/session.types.ts";
import type { CostTracker } from "../../../shared/cost.types.ts";

// What the questioning loop reads off a planTurn result; the planner returns a
// superset, and the planner-failed fallback below matches this exactly.
interface TurnPlan {
  assessment: { deltas: Record<string, number>; note: string };
  newQueue: Question[];
  issues?: string[];
  unbooked_signal?: Array<{ axis: string; raw: number; booked: number; reason: string }>;
  prompt: string | null;
  response: unknown;
}

async function runQuestioningLoop({
  ctx,
  focusPoints,
  queue,
  closer,
  prepOpener,
  prep,
  totalBudget,
  session,
  tracker,
  ask,
}: {
  ctx: MeetingContext;
  focusPoints: unknown;
  queue: Question[];
  closer: Question | null;
  prepOpener: Question | null;
  prep: PreparationResult["brief"] | null;
  totalBudget: number;
  session: { dir: string };
  tracker: CostTracker;
  ask: (prompt: string) => Promise<string>;
}): Promise<{ transcript: TranscriptEntry[]; axisState: AxisState; scoring: { failures: number; scoredTurns: number } }> {
  const axisState = initState();
  const transcript: TranscriptEntry[] = [];
  const dynamicAnswersDir = sessionFile(session, "04-dynamic-answers");
  fs.mkdirSync(dynamicAnswersDir, { recursive: true });

  let turn = 0;
  let queueRef = queue;
  let plannerFailures = 0;
  let scoredTurns = 0;

  // The legitimate question pool for THIS session: the assembled queue plus the
  // reserved prep-opener and closer. Coverage pulls from here instead of the
  // whole global bank, so it can't surface another persona's saved question.
  const sessionBank: Question[] = [];
  const seenBankAliases = new Set<string>();
  for (const item of [...queue, prepOpener, closer]) {
    if (item?.alias && !seenBankAliases.has(item.alias)) {
      seenBankAliases.add(item.alias);
      sessionBank.push(item);
    }
  }

  console.log();
  console.log(HR);
  console.log("  " + magentaBold("QUESTIONING") + dim("   (enter to skip · type to record)"));
  console.log(HR);
  console.log();

  while (turn < totalBudget && queueRef.length > 0) {
    // Serve-time gate — the last line of defence: no question reaches the
    // screen without passing the eligibility check, whichever path queued it.
    const servedRejections = dropIneligibleHeads(queueRef, {
      meetingType: ctx.meetingType,
      askedNames: transcript.map((t) => t.question.name),
    });
    if (servedRejections.length) {
      appendEligibilityLog(sessionFile(session, "eligibility-log.json"), servedRejections);
      for (const r of servedRejections) {
        console.log("  " + dim(`eligibility: skipped ${r.alias || r.label} (${r.reason})`));
      }
    }
    if (queueRef.length === 0) break;
    turn += 1;
    const q = queueRef.shift();
    if (!q) break;
    const pos = renderQueuePos(turn, totalBudget);
    const queueLen = dim(`(${queueRef.length} more queued)`);
    console.log(`  ${pos}  ${dim(q.purpose || "")}  ${queueLen}`);
    console.log(`  ${bold(q.name)}`);
    if (q.description) console.log(`  ${gray(q.description)}`);
    const answer = await ask(cyan("  › "));

    const skipped = isSkip(answer);
    const answerText = skipped ? "(skipped)" : answer;
    const remainingBudget = Math.max(0, totalBudget - turn);

    const entry: TranscriptEntry = {
      turn,
      question: q,
      answer: answerText,
      skipped,
    };
    transcript.push(entry);

    let plan: TurnPlan;
    if (!skipped) scoredTurns += 1;
    try {
      plan = await withThinking(
        skipped ? "Recording skip & re-planning queue" : "Scoring answer & re-planning queue",
        () =>
          planTurn({
            focusPoints,
            ctx,
            transcript,
            lastQuestion: q,
            lastAnswer: answerText,
            axisState,
            remainingQueue: queueRef,
            remainingBudget,
            turnNumber: turn,
            totalTurns: totalBudget,
            closerAlias: closer ? closer.alias : null,
            prep,
            sessionBank,
          })
      );
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : String(e);
      if (!skipped) plannerFailures += 1;
      console.log("  " + red("Planner failed — keeping queue as-is and moving on."));
      console.log("  " + dim(errMessage));
      plan = {
        assessment: { deltas: {}, note: "(planner failed)" },
        newQueue: queueRef,
        issues: [errMessage],
        prompt: "",
        response: "",
      };
    }

    applyDeltas(axisState, {
      questionAlias: q.alias,
      answerExcerpt: answerText,
      deltas: plan.assessment.deltas,
    });

    entry.realized_deltas = plan.assessment.deltas;
    entry.note = plan.assessment.note;
    if (plan.unbooked_signal?.length) entry.unbooked_signal = plan.unbooked_signal;

    const axesSummary = summarize(axisState);
    console.log();
    console.log("  " + renderAxisLine(axesSummary));
    console.log(renderDebugLine(axesSummary, q.alias));
    if (plan.assessment.note) console.log("  " + dim(`note: ${plan.assessment.note}`));
    const cs = tracker.summary();
    console.log(
      "  " +
        dim(
          `cost: ${cost.formatUsd(cs.usd_total)}  ·  ${cs.call_count} calls  ·  ${cost.formatTokens(cs.total_tokens)} tokens`
        )
    );

    const beforeAliases = queueRef.map((x) => x.alias);
    queueRef = plan.newQueue.slice();

    const askedAliases = new Set(transcript.map((t) => t.question.alias));

    // Pin the prep opener as the first substantive question until it's asked —
    // the planner re-plans freely and would otherwise bury it. Runs before the
    // closer force-insert so the closer still wins on the final turn.
    queueRef = pinPrepOpenerEarly(queueRef, prepOpener, askedAliases, ctx.meetingType);

    if (turn + 1 === totalBudget && closer && !askedAliases.has(closer.alias) && !isForbiddenCloser(closer)) {
      if (queueRef[0]?.alias !== closer.alias) {
        queueRef = queueRef.filter((x) => x.alias !== closer.alias);
        queueRef.unshift(closer);
        console.log("  " + dim(`closer force-inserted at position 0: ${closer.alias}`));
      }
    }

    const afterAliases = queueRef.map((x) => x.alias);
    if (JSON.stringify(beforeAliases) !== JSON.stringify(afterAliases)) {
      console.log("  " + dim(`queue: ${afterAliases.length ? afterAliases.join(" → ") : "(empty)"}`));
    } else {
      console.log("  " + dim(`queue: unchanged (${afterAliases.length} items)`));
    }
    if (plan.issues?.length) {
      for (const issue of plan.issues) console.log("  " + dim(`note: ${issue}`));
    }

    if (queueRef.length === 0 && turn < totalBudget) {
      const seeds = loadDir("_seed").map(seedToQuestion);
      const seen = new Set(transcript.map((t) => t.question.alias));
      const rejections: ReturnType<typeof dropIneligibleHeads> = [];
      const picked = pickSeedOverflow(seeds, seen, {
        meetingType: ctx.meetingType,
        askedNames: transcript.map((t) => t.question.name),
        rejections,
      });
      if (rejections.length) {
        appendEligibilityLog(sessionFile(session, "eligibility-log.json"), rejections);
      }
      // pickSeedOverflow returns the loose closer-question view; recover the
      // Question from the (narrowed) seed list so it can rejoin the queue.
      const seed = picked ? seeds.find((s) => s.alias === picked.alias) : undefined;
      if (seed) queueRef.push(seed);
      // No eligible seed → the loop ends and the session moves into its normal
      // closing/evaluation stage; never serve a bad question just to fill time.
    }

    writeJson(path.join(dynamicAnswersDir, `${String(turn).padStart(2, "0")}-turn.json`), {
      turn,
      question: q,
      answer: answerText,
      skipped,
      assessment: plan.assessment,
      new_queue: queueRef.map((x) => ({ alias: x.alias, label: x.label, name: x.name })),
      issues: plan.issues || [],
      unbooked_signal: plan.unbooked_signal || [],
      axis_state: serialize(axisState),
    });
    writeJson(sessionFile(session, "transcript.json"), transcript);
    writeJson(sessionFile(session, "axis-state.json"), serialize(axisState));

    if (plan.prompt) {
      fs.writeFileSync(
        path.join(dynamicAnswersDir, `${String(turn).padStart(2, "0")}-prompt.md`),
        plan.prompt
      );
      fs.writeFileSync(
        path.join(dynamicAnswersDir, `${String(turn).padStart(2, "0")}-response.json`),
        typeof plan.response === "string" ? plan.response : JSON.stringify(plan.response, null, 2)
      );
    }

    console.log();
  }

  if (plannerFailures > 0) {
    console.log(
      "  " +
        red(
          `⚠ scoring engine failed on ${plannerFailures} of ${scoredTurns} scored turns — axis scores are unreliable; the briefing will lead with low confidence.`
        )
    );
  }

  return { transcript, axisState, scoring: { failures: plannerFailures, scoredTurns } };
}

export { runQuestioningLoop };
