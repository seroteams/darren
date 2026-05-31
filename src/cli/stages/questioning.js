const fs = require("node:fs");
const path = require("node:path");

const questions = require("../../questions");
const { planTurn } = require("../../queue-manager");
const { isForbiddenCloser, pickSeedOverflow } = require("../../closer");
const { initState, applyDeltas, summarize, serialize } = require("../../axes");
const cost = require("../../cost");
const { writeJson, sessionFile, isSkip } = require("../io");
const {
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
} = require("../../ui");

async function runQuestioningLoop({
  ctx,
  focusPoints,
  queue,
  closer,
  totalBudget,
  session,
  tracker,
  ask,
}) {
  const axisState = initState();
  const transcript = [];
  const dynamicAnswersDir = sessionFile(session, "04-dynamic-answers");
  fs.mkdirSync(dynamicAnswersDir, { recursive: true });

  let turn = 0;
  let queueRef = queue;

  console.log();
  console.log(HR);
  console.log("  " + magentaBold("QUESTIONING") + dim("   (enter to skip · type to record)"));
  console.log(HR);
  console.log();

  while (turn < totalBudget && queueRef.length > 0) {
    turn += 1;
    const q = queueRef.shift();
    const pos = renderQueuePos(turn, totalBudget);
    const queueLen = dim(`(${queueRef.length} more queued)`);
    console.log(`  ${pos}  ${dim(q.purpose || "")}  ${queueLen}`);
    console.log(`  ${bold(q.name)}`);
    if (q.description) console.log(`  ${gray(q.description)}`);
    const answer = await ask(cyan("  › "));

    const skipped = isSkip(answer);
    const answerText = skipped ? "(skipped)" : answer;
    const remainingBudget = Math.max(0, totalBudget - turn);

    transcript.push({
      turn,
      question: q,
      answer: answerText,
      skipped,
    });

    let plan;
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
          })
      );
    } catch (e) {
      console.log("  " + red("Planner failed — keeping queue as-is and moving on."));
      console.log("  " + dim(e.message));
      plan = {
        assessment: { deltas: {}, note: "(planner failed)" },
        newQueue: queueRef,
        issues: [e.message],
        prompt: "",
        response: "",
      };
    }

    applyDeltas(axisState, {
      questionAlias: q.alias,
      answerExcerpt: answerText,
      deltas: plan.assessment.deltas,
    });

    const current = transcript[transcript.length - 1];
    current.realized_deltas = plan.assessment.deltas;
    current.note = plan.assessment.note;

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
      const seeds = questions.loadDir("_seed");
      const seen = new Set(transcript.map((t) => t.question.alias));
      const seed = pickSeedOverflow(seeds, seen);
      if (seed) queueRef.push(seed);
    }

    writeJson(path.join(dynamicAnswersDir, `${String(turn).padStart(2, "0")}-turn.json`), {
      turn,
      question: q,
      answer: answerText,
      skipped,
      assessment: plan.assessment,
      new_queue: queueRef.map((x) => ({ alias: x.alias, label: x.label, name: x.name })),
      issues: plan.issues || [],
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

  return { transcript, axisState };
}

module.exports = { runQuestioningLoop };
