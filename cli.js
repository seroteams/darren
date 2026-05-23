const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("./src/env");
const { createAsker } = require("./src/ask");
const { MEETING_TYPES } = require("./src/meeting-types");
const { generateFocusPoints } = require("./src/generate");
const { generatePreparation } = require("./src/preparation");
const { createSession, logFeedback } = require("./src/session");
const { listRecentRuns, summarizeRun, deleteRun } = require("./src/run-history");
const { initState, applyDeltas, summarize, serialize } = require("./src/axes");
const { generateBankWithFallback } = require("./src/question-generator");
const { INTRO_BUDGET, DYNAMIC_BUDGET } = require("./frontend/server/sessions");
const { planTurn } = require("./src/queue-manager");
const { evaluate } = require("./src/reviewer");
const { reviewSession: reviewLexiconSession } = require("./src/lexicon-reviewer");
const { getArc } = require("./src/meeting-arcs");
const questions = require("./src/questions");
const cost = require("./src/cost");
const { renderBriefing } = require("./src/briefing");
const {
  bold,
  dim,
  cyan,
  cyanBold,
  yellow,
  magentaBold,
  gray,
  red,
  green,
  HR,
  pad,
  renderAxisLine,
  renderQueuePos,
  renderDebugLine,
  withThinking,
} = require("./src/ui");

loadEnv();

function sessionFile(session, name) {
  return path.join(session.dir, name);
}

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function isSkip(input) {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

function loadIntroQueue(meetingTypeLabel) {
  const slug = questions.slugify(meetingTypeLabel);
  const loaded = questions.loadDir(path.join("_intro", slug));
  return loaded.slice(0, INTRO_BUDGET);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(red("OPENAI_API_KEY env var not set."));
    console.error("  cmd:        set OPENAI_API_KEY=sk-...");
    console.error("  PowerShell: $env:OPENAI_API_KEY='sk-...'");
    console.error("  bash:       export OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  const { ask, close: closeAsker } = createAsker();

  console.log();
  console.log("  " + cyanBold("Sero") + dim(" — 1:1 prep"));
  console.log(HR);

  try {
    const lines = fs.readFileSync(path.join(__dirname, "notes", "whats-new.md"), "utf8")
      .split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length) {
      console.log();
      console.log("  " + dim("↳ ") + lines[0]);
      for (const l of lines.slice(1)) console.log("  " + dim("  " + l));
    }
  } catch (_) {}

  // Recent-runs start menu. Skip entirely if no past runs.
  while (true) {
    const recent = listRecentRuns(3);
    if (recent.length === 0) break;
    console.log();
    console.log("  " + bold("Recent runs"));
    console.log("  " + dim("─────────────"));
    recent.forEach((r, i) => {
      console.log("  " + dim(`[${i + 1}]`) + "  " + r.headline + "  " + dim(`· ${r.stage}`));
    });
    console.log();
    const choice = (await ask(cyan("  [n] new run   [1-3] view   [d <n>] delete   › "))).trim().toLowerCase();
    if (choice === "" || choice === "n") break;
    const viewMatch = /^[1-3]$/.exec(choice);
    if (viewMatch) {
      const idx = Number(viewMatch[0]) - 1;
      if (recent[idx]) {
        const summary = summarizeRun(recent[idx].id);
        console.log();
        if (summary) console.log("  " + summary.overview);
        console.log("  " + dim("Resume from CLI not supported — open web app to continue."));
      }
      continue;
    }
    const delMatch = /^d\s+([1-3])$/.exec(choice);
    if (delMatch) {
      const idx = Number(delMatch[1]) - 1;
      if (recent[idx]) {
        const ans = (await ask(cyan(`  Delete "${recent[idx].headline}"? [y/N] `))).trim().toLowerCase();
        if (ans === "y") {
          deleteRun(recent[idx].id);
          console.log("  " + dim("Deleted."));
        }
      }
      continue;
    }
    console.log("  " + dim("Unrecognised — try [n], [1-3], or [d 1]."));
  }

  const session = createSession();
  const tracker = cost.createTracker();
  cost.setActive(tracker);

  console.log();
  const sessionRel = path.relative(__dirname, session.dir).replace(/\\/g, "/");
  console.log("  " + dim(`session ${session.id}`));
  console.log("  " + dim(`log → ${sessionRel}/`));
  console.log(HR);
  console.log();

  const name = await ask(cyan("  Their name?     "));
  const role = await ask(cyan("  Their role?     "));
  const seniority = await ask(cyan("  Seniority?      "));

  console.log();
  console.log("  " + bold("What kind of meeting?"));
  console.log();
  MEETING_TYPES.forEach((m, i) => {
    const badge = m.badge ? "  " + yellow(`[${m.badge}]`) : "";
    console.log(`  ${dim(`[${i + 1}]`)}  ${bold(m.label)}${badge}`);
    console.log(`       ${dim(`${m.duration} · ${m.description}`)}`);
    console.log();
  });

  let meetingType = null;
  while (!meetingType) {
    const pick = await ask(cyan(`  Pick a number (1-${MEETING_TYPES.length}): `));
    const idx = Number(pick) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < MEETING_TYPES.length) {
      meetingType = MEETING_TYPES[idx];
    } else {
      console.log(red(`  Please enter a number between 1 and ${MEETING_TYPES.length}.`));
    }
  }

  console.log();
  console.log("  " + bold("Anything else Sero should know?") + dim("  (optional)"));
  console.log(
    "  " +
      dim("e.g. They've been working late recently, or we had a slight disagreement last week...")
  );
  const notes = await ask(cyan("  > "));

  // ------------------------------------------------------------------ Stage 1
  const ctx = { name, role, seniority, meetingType: meetingType.label, notes };

  console.log();
  console.log(HR);

  const result = await withThinking("Choosing focus points", () =>
    generateFocusPoints(ctx, { session })
  );

  console.log(HR);
  console.log();
  console.log("  " + dim(pad("Meeting", 8)) + "  " + bold(result.meeting_type));
  console.log(
    "  " +
      dim(pad("With", 8)) +
      "  " +
      bold(name) +
      dim(" · ") +
      role +
      dim(" · ") +
      seniority
  );
  console.log();
  console.log("  " + magentaBold("FOCUS POINTS"));
  console.log("  " + dim("─".repeat(12)));
  console.log();

  result.focus_points.forEach((fp, i) => {
    const warn = fp.known === false ? "  " + red("[!] not in catalogue") : "";
    const type = fp.type || fp.id || "—";
    console.log(`  ${yellow(`${i + 1}.`)} ${magentaBold(type)}${warn}`);
    if (fp.label && fp.label !== type) console.log(`     ${bold(fp.label)}`);
    if (fp.reason) console.log(`     ${gray(fp.reason)}`);
    console.log();
  });

  console.log(HR);
  console.log();

  // ----------------------------------------------------- Continue? → Stage 2+
  let go;
  while (true) {
    go = await ask(cyan("  Start the 1:1 questioning stage? ") + dim("[Y/n/r to regenerate] "));
    if (/^n/i.test(go)) {
      console.log("  " + dim(`Log: ${path.relative(__dirname, session.dir).replace(/\\/g, "/")}/01-focus-points/`));
      closeAsker();
      return;
    }
    if (/^r/i.test(go)) {
      console.log();
      console.log(HR);
      const regen = await withThinking("Regenerating focus points", () =>
        generateFocusPoints(ctx, { session })
      );
      result.focus_points = regen.focus_points;
      console.log(HR);
      console.log();
      console.log("  " + magentaBold("FOCUS POINTS  ") + dim("(regenerated)"));
      console.log("  " + dim("─".repeat(12)));
      console.log();
      regen.focus_points.forEach((fp, i) => {
        const warn = fp.known === false ? "  " + red("[!] not in catalogue") : "";
        const type = fp.type || fp.id || "—";
        console.log(`  ${yellow(`${i + 1}.`)} ${magentaBold(type)}${warn}`);
        if (fp.label && fp.label !== type) console.log(`     ${bold(fp.label)}`);
        if (fp.reason) console.log(`     ${gray(fp.reason)}`);
        console.log();
      });
      console.log(HR);
      console.log();
      continue;
    }
    break;
  }

  // ---------------------------------------------------------- Stage 1b: Prep
  console.log();
  console.log(HR);

  const prepResult = await withThinking("Preparing your briefing", () =>
    generatePreparation(
      {
        name,
        role,
        seniority,
        meetingType: meetingType.label,
        notes,
        focusPoints: result.focus_points,
      },
      { session }
    )
  );

  const prep = prepResult.brief;

  console.log(HR);
  console.log();
  console.log("  " + magentaBold("PREPARATION BRIEFING"));
  console.log("  " + dim("─".repeat(20)));
  console.log();

  console.log("  " + bold("What this 1:1 is probably about"));
  console.log("  " + gray(prep.coreIssue));
  console.log();

  console.log("  " + bold("Start with this question"));
  console.log("  " + cyan(`"${prep.openingQuestion}"`));
  console.log();

  console.log("  " + bold("Listen for"));
  (prep.listenFor || []).forEach(item => console.log(`  ${dim("–")} ${item}`));
  console.log();

  console.log("  " + bold("Avoid"));
  (prep.avoid || []).forEach(item => console.log(`  ${dim("–")} ${item}`));
  console.log();

  console.log("  " + bold("Good outcome"));
  console.log("  " + gray(prep.goodOutcome));
  console.log();

  console.log("  " + bold("Suggested action to agree"));
  console.log("  " + gray(prep.suggestedAction));
  console.log();

  if (!prepResult.validation.passed) {
    console.log("  " + yellow("⚠ Validation warnings:"));
    prepResult.validation.issues.forEach(issue => console.log("  " + dim(`  · ${issue}`)));
    console.log();
  }

  console.log(HR);
  console.log();

  // ------------------------------------------------------------------ Stage 2
  const introQueue = loadIntroQueue(meetingType.label);
  const queue = [...introQueue];

  writeJson(sessionFile(session, "02-intro-questions/aliases.json"), {
    meeting_type: meetingType.label,
    aliases: introQueue.map((q) => q.alias),
  });

  // ------------------------------------------------------------------ Stage 3
  console.log();
  console.log(HR);
  const bank = await withThinking("Generating question bank", () =>
    generateBankWithFallback(
      { focusPoints: result.focus_points, ...ctx, existingQueue: introQueue },
      { session },
      {
        onFallback: (e) => {
          console.log("  " + red("Bank generation failed — falling back to seed bank."));
          console.log("  " + dim(e.message));
        },
      }
    )
  );
  queue.push(...bank);

  // Reserve the closer: last question in the bank tagged with the arc's final stage.
  // The runtime force-inserts this at the head of the queue when the next turn is final,
  // so the planner can't accidentally drop or replace it.
  const arc = getArc(meetingType.label);
  const finalStageId = arc.arc[arc.arc.length - 1].id;
  const closerCandidates = bank.filter((q) => q.stage === finalStageId);
  const closer = closerCandidates.length ? closerCandidates[closerCandidates.length - 1] : null;
  if (closer) {
    console.log("  " + dim(`closer reserved: ${closer.alias} (stage: ${finalStageId})`));
  } else {
    console.log("  " + dim(`closer reserved: (none — bank had no '${finalStageId}' question; planner will generate one)`));
  }

  // ------------------------------------------------------------ Stage 4 loop
  const axisState = initState();
  const transcript = [];
  const dynamicAnswersDir = sessionFile(session, "04-dynamic-answers");
  fs.mkdirSync(dynamicAnswersDir, { recursive: true });

  const totalBudget = INTRO_BUDGET + DYNAMIC_BUDGET;
  let turn = 0;

  console.log();
  console.log(HR);
  console.log("  " + magentaBold("QUESTIONING") + dim("   (enter to skip · type to record)"));
  console.log(HR);
  console.log();

  let queueRef = queue;

  while (turn < totalBudget && queueRef.length > 0) {
    turn += 1;
    const q = queueRef.shift();
    const pos = renderQueuePos(turn, totalBudget);
    const queueLen = dim(`(${queueRef.length} more queued)`);
    console.log(`  ${pos}  ${dim(q.purpose || "")}  ${queueLen}`);
    console.log(`  ${bold(q.name)}`);
    if (q.description) console.log(`  ${gray(q.description)}`);
    let answer = await ask(cyan("  › "));

    const skipped = isSkip(answer);
    const answerText = skipped ? "(skipped)" : answer;

    const remainingBudget = Math.max(0, totalBudget - turn);

    // Push turn into transcript BEFORE planning so the prompt sees it as asked.
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
            focusPoints: result.focus_points,
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

    // Stamp the realized deltas + note onto the transcript entry we just pushed
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

    // Replace the queue with the planner's returned list.
    const beforeAliases = queueRef.map((x) => x.alias);
    queueRef = plan.newQueue.slice();

    // Force-insert the reserved closer when the next turn IS the last.
    // The planner gets veto-proof: regardless of what it returned, the closer runs last.
    const askedAliases = new Set(transcript.map((t) => t.question.alias));
    if (turn + 1 === totalBudget && closer && !askedAliases.has(closer.alias)) {
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
    if (plan.issues && plan.issues.length) {
      for (const issue of plan.issues) console.log("  " + dim(`note: ${issue}`));
    }

    // If the planner returned an empty queue but we still have budget, pull from _seed as overflow
    if (queueRef.length === 0 && turn < totalBudget) {
      const seeds = questions.loadDir("_seed");
      const seen = new Set(transcript.map((t) => t.question.alias));
      const fresh = seeds.filter((s) => !seen.has(s.alias));
      if (fresh.length) queueRef.push(fresh[0]);
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

  // ------------------------------------------------------------------ Stage 5
  console.log(HR);
  const finalEval = await withThinking("Final evaluation", () =>
    evaluate(
      {
        ctx,
        focusPoints: result.focus_points,
        transcript: transcript.map((t) => ({
          question: t.question.name,
          alias: t.question.alias,
          answer: t.answer,
          skipped: t.skipped,
        })),
        axisState: serialize(axisState),
        notes,
      },
      { session }
    )
  );

  console.log(HR);
  console.log();
  renderBriefing(finalEval, name);

  const finalCost = tracker.summary();
  writeJson(sessionFile(session, "cost.json"), finalCost);

  console.log("  " + bold("Session cost"));
  console.log(
    "    " +
      cost.formatUsd(finalCost.usd_total) +
      dim("   across ") +
      `${finalCost.call_count}` +
      dim(" API calls  ·  ") +
      `${cost.formatTokens(finalCost.total_tokens)}` +
      dim(" tokens  (") +
      `${cost.formatTokens(finalCost.prompt_tokens)}` +
      dim(" in, ") +
      `${cost.formatTokens(finalCost.completion_tokens)}` +
      dim(" out")
      + (finalCost.cached_tokens ? dim(`, ${cost.formatTokens(finalCost.cached_tokens)} cached`) : "")
      + dim(")")
  );
  const perStage = {};
  for (const c of finalCost.calls) {
    if (!perStage[c.stage]) perStage[c.stage] = { n: 0, usd: 0, tok: 0 };
    perStage[c.stage].n += 1;
    if (c.known_price && c.usd_cost != null) perStage[c.stage].usd += c.usd_cost;
    perStage[c.stage].tok += (c.prompt_tokens + c.completion_tokens);
  }
  for (const [stage, s] of Object.entries(perStage)) {
    console.log(
      "    " +
        dim(pad(stage, 20)) +
        " " +
        pad(`${s.n}×`, 4) +
        " " +
        pad(cost.formatUsd(s.usd), 9) +
        " " +
        dim(cost.formatTokens(s.tok) + " tok")
    );
  }
  if (finalCost.unknown_price_calls > 0) {
    console.log("  " + yellow(`⚠ ${finalCost.unknown_price_calls} API call(s) used an unrecognised model — cost total is understated`));
  }
  console.log();
  console.log(HR);
  console.log("  " + dim(`Log: ${path.relative(__dirname, session.dir).replace(/\\/g, "/")}/`));
  console.log();

  // ---------------------------------------------------------------- Lexicon review (gated to scope)
  try {
    await reviewLexiconSession({ session, ctx, ask });
  } catch (e) {
    console.log("  " + dim(`lexicon review error: ${e.message}`));
  }

  // ---------------------------------------------------------------- Post-run rating
  await collectRunRating(ask, session);
  closeAsker();
}

async function collectRunRating(ask, session) {
  const STAGES = {
    "1": { key: "overall", dir: null },
    "2": { key: "focus_points", dir: "01-focus-points" },
    "3": { key: "question_bank", dir: "03-question-bank" },
    "4": { key: "evaluation", dir: "05-evaluation" },
  };

  const rawRating = await ask(cyan("  Rate this run 1–5 (or Enter to skip): "));
  const rating = parseInt(rawRating.trim(), 10);
  if (!(rating >= 1 && rating <= 5)) return;

  console.log(dim("  Stage?  (1) overall  (2) focus points  (3) questions  (4) evaluation"));
  const stagePick = await ask(cyan("  › "));
  const stage = STAGES[stagePick.trim()] || STAGES["1"];

  const noteRaw = await ask(cyan("  Note (or Enter to skip): "));
  const note = noteRaw.trim() || null;

  const logBase = path.relative(__dirname, session.dir).replace(/\\/g, "/");
  const files = stage.dir
    ? {
        inputs: path.join(logBase, stage.dir, "inputs.json"),
        prompt: path.join(logBase, stage.dir, "prompt.md"),
        response: path.join(logBase, stage.dir, "response.json"),
      }
    : {
        transcript: path.join(logBase, "transcript.json"),
        axis_state: path.join(logBase, "axis-state.json"),
        evaluation_response: path.join(logBase, "05-evaluation", "response.json"),
      };

  logFeedback(session, {
    type: "run_rating",
    sessionId: session.id,
    rating,
    stage: stage.key,
    note,
    files,
  });

  console.log("  " + dim("Saved. ✓"));
  console.log();
}

main().catch((e) => {
  console.error(red(e.message || e));
  process.exit(1);
});
