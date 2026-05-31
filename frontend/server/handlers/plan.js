const fs = require("node:fs");
const path = require("node:path");
const { requireSession, summarizeAxes, persistSession } = require("../sessions");
const { openStream } = require("../sse");
const { planTurn } = require("../../../src/queue-manager");
const { applyDeltas, serialize } = require("../../../src/axes");
const questions = require("../../../src/questions");
const { writeJson } = require("../../../src/cli/io");
const cost = require("../../../src/cost");

module.exports = async function plan(c) {
  const session = requireSession(c.query.s);
  const stream = openStream(c.res);

  // --- Idempotent replay of an already-completed turn
  const turnForStream = session.turn + (session.pendingAnswer ? 1 : 0);
  const cached = session.lastPlanByTurn.get(turnForStream);
  if (cached) {
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
  session.pendingAnswer = null;

  const q = session.queueRef.shift();
  session.turn += 1;
  const turn = session.turn;

  const thinkingLabel = pending.skipped
    ? "Recording skip & re-planning queue"
    : "Scoring answer & re-planning queue";
  stream.write("thinking", { label: thinkingLabel });

  // Mirror cli.js: push turn into transcript BEFORE planning
  session.transcript.push({
    turn,
    question: q,
    answer: pending.text,
    skipped: pending.skipped,
  });

  const remainingBudget = Math.max(0, session.totalBudget - turn);

  let planResult;
  const prevTracker = cost.getActive();
  cost.setActive(session.tracker);
  try {
    planResult = await planTurn({
      focusPoints: session.focusPointsResult.focus_points,
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
    });
  } catch (e) {
    console.warn("[plan] planner failed:", e.message);
    planResult = {
      assessment: { deltas: {}, note: "(planner failed)" },
      newQueue: session.queueRef,
      issues: [e.message],
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

  const current = session.transcript[session.transcript.length - 1];
  current.realized_deltas = planResult.assessment.deltas;
  current.note = planResult.assessment.note;

  session.queueRef = planResult.newQueue.slice();

  // Force-insert the reserved closer when the next turn IS the last.
  // The planner gets veto-proof: regardless of what it returned, the closer runs last.
  const askedAliases = new Set(session.transcript.map((t) => t.question.alias));
  if (
    turn + 1 === session.totalBudget &&
    session.closer &&
    !askedAliases.has(session.closer.alias)
  ) {
    if (session.queueRef[0]?.alias !== session.closer.alias) {
      session.queueRef = session.queueRef.filter((x) => x.alias !== session.closer.alias);
      session.queueRef.unshift(session.closer);
      planResult.issues = [
        ...(planResult.issues || []),
        `closer force-inserted: ${session.closer.alias}`,
      ];
    }
  }

  // Overflow from _seed if planner emptied the queue but we still have budget
  if (session.queueRef.length === 0 && turn < session.totalBudget) {
    const seeds = questions.loadDir("_seed");
    const seen = new Set(session.transcript.map((t) => t.question.alias));
    const fresh = seeds.filter((s) => !seen.has(s.alias));
    if (fresh.length) session.queueRef.push(fresh[0]);
  }

  const axes = summarizeAxes(session.axisState);
  const issues = planResult.issues?.length ? planResult.issues : undefined;
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
      axis_state: serialize(session.axisState),
    }
  );
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
};
