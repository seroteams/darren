const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("./src/env");
const { createAsker } = require("./src/ask");
const { MEETING_TYPES, INTRO_BUDGET, DYNAMIC_BUDGET } = require("./src");
const { createSession } = require("./src/session");
const { listRecentRuns, summarizeRun, deleteRun, findLatestRunWithLock } = require("./src/run-history");
const { buildPipelineStatus } = require("./src/pipeline-lock");
const { reviewSession: reviewLexiconSession } = require("./src/lexicon-reviewer");
const { loadIntroQueue } = require("./src/intro-queue");
const { ensureRoleProfile } = require("./src/role-profile");
const cost = require("./src/cost");
const { runFocusPointsStage } = require("./src/cli/stages/focus-points");
const { runPreparationStage } = require("./src/cli/stages/preparation");
const { runQuestionBankStage } = require("./src/cli/stages/question-bank");
const { runQuestioningLoop } = require("./src/cli/stages/questioning");
const { runEvaluationStage, writeSessionCost } = require("./src/cli/stages/evaluation");
const { collectRunRating } = require("./src/cli/run-rating");
// run-debrief is an ES module (shared with the Vite browser build); loaded lazily in main().
const {
  bold,
  dim,
  cyan,
  cyanBold,
  yellow,
  red,
  HR,
} = require("./src/ui");

loadEnv();

function printPipelineDelta() {
  const latest = findLatestRunWithLock();
  if (!latest?.lock) return;
  const status = buildPipelineStatus({
    baselineLock: latest.lock,
    baselineRunId: latest.id,
    baselineHeadline: latest.headline,
  });
  if (status.unchanged) {
    console.log("  " + dim("Pipeline: matches last run"));
    return;
  }
  const s = status.summary || {};
  const parts = [];
  const contentN =
    (s.contentModified || 0) + (s.contentAdded || 0) + (s.contentRemoved || 0);
  const engineN =
    (s.engineModified || 0) + (s.engineAdded || 0) + (s.engineRemoved || 0);
  if (contentN) parts.push(`${contentN} content`);
  if (engineN) parts.push(`${engineN} engine`);
  if (s.modelsChanged?.length) parts.push(s.modelsChanged.join(", ") + " model");
  if (s.gitChanged) parts.push("git");
  console.log("  " + yellow("Pipeline vs last run: " + (parts.join(" · ") || "changed")));
  for (const g of status.groups || []) {
    if (g.id === "models") {
      for (const c of g.changes) {
        console.log("  " + dim(`  · ${c.stage}: ${c.from} → ${c.to}`));
      }
    } else if (g.id === "git") {
      const c = g.changes[0];
      const from = c.from ? c.from.sha : "?";
      const to = c.to ? c.to.sha : "?";
      console.log("  " + dim(`  · git: ${from} → ${to}${c.to?.dirty ? " (dirty)" : ""}`));
    } else {
      for (const c of g.changes.slice(0, 8)) {
        console.log("  " + dim(`  · ${c.path} (${c.stageLabel})`));
      }
      if (g.changes.length > 8) {
        console.log("  " + dim(`  · … +${g.changes.length - 8} more`));
      }
    }
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(red("OPENAI_API_KEY env var not set."));
    console.error("  cmd:        set OPENAI_API_KEY=sk-...");
    console.error("  PowerShell: $env:OPENAI_API_KEY='sk-...");
    console.error("  bash:       export OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  const { ask, close: closeAsker } = createAsker();

  console.log();
  console.log("  " + cyanBold("Sero") + dim(" — 1:1 prep"));
  console.log(HR);

  try {
    const lines = fs
      .readFileSync(path.join(__dirname, "notes", "whats-new.md"), "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length) {
      console.log();
      console.log("  " + dim("↳ ") + lines[0]);
      for (const l of lines.slice(1)) console.log("  " + dim("  " + l));
    }
  } catch {}

  while (true) {
    const recent = listRecentRuns(3);
    if (recent.length === 0) break;
    console.log();
    console.log("  " + bold("Recent runs"));
    console.log("  " + dim("─────────────"));
    recent.forEach((r, i) => {
      console.log("  " + dim(`[${i + 1}]`) + "  " + r.headline + "  " + dim(`· ${r.stage}`));
    });
    printPipelineDelta();
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
  session.createdAt = Date.now();
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

  // Kicks off now so it runs while the user picks a meeting type and types
  // notes; awaited (with fallback) just before the pipeline needs it.
  const roleProfilePromise = ensureRoleProfile({ role, seniority }, { session }).catch((err) => ({
    status: "unavailable",
    key: null,
    doc: null,
    error: err.message,
  }));

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

  const ctx = { name, role, seniority, meetingType: meetingType.label, notes };
  const result = {};

  const roleProfileOutcome = await roleProfilePromise;
  console.log("  " + dim(`role profile: ${roleProfileOutcome.status} (${roleProfileOutcome.key || "no key"})`));

  const focusOutcome = await runFocusPointsStage({ ctx, session, ask, result });
  if (!focusOutcome.continue) {
    console.log("  " + dim(`Log: ${path.relative(__dirname, session.dir).replace(/\\/g, "/")}/01-focus-points/`));
    closeAsker();
    return;
  }

  const prepResult = await runPreparationStage({ ctx, focusPoints: result.focus_points, session });

  const introQueue = loadIntroQueue(meetingType.label, INTRO_BUDGET);
  const { queue, closer, prepOpener } = await runQuestionBankStage({
    ctx,
    focusPoints: result.focus_points,
    meetingTypeLabel: meetingType.label,
    introQueue,
    prep: prepResult?.brief || null,
    session,
  });

  const totalBudget = INTRO_BUDGET + DYNAMIC_BUDGET;
  const { transcript, axisState, scoring } = await runQuestioningLoop({
    ctx,
    focusPoints: result.focus_points,
    queue,
    closer,
    prepOpener,
    prep: prepResult?.brief || null,
    totalBudget,
    session,
    tracker,
    ask,
  });

  await runEvaluationStage({
    ctx,
    focusPoints: result.focus_points,
    transcript,
    axisState,
    notes,
    scoring,
    session,
    name,
  });

  writeSessionCost(session, tracker);
  session.completedAt = Date.now();

  console.log();
  console.log(HR);
  console.log("  " + dim(`Log: ${path.relative(__dirname, session.dir).replace(/\\/g, "/")}/`));
  console.log();

  const { buildRunDebriefPayload, printRunDebrief } = await import("./src/run-debrief.mjs");
  const debriefPayload = buildRunDebriefPayload({
    sessionId: session.id,
    sessionDir: session.dir,
    notes,
    cost: tracker.summary(),
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    meetingType: ctx.meetingType,
    surface: "cli",
  });
  printRunDebrief(debriefPayload, { dim, cyan, HR });

  try {
    await reviewLexiconSession({ session, ctx, ask });
  } catch (e) {
    console.log("  " + dim(`lexicon review error: ${e.message}`));
  }

  await collectRunRating(ask, session);
  closeAsker();
}

main().catch((e) => {
  console.error(red(e.message || e));
  process.exit(1);
});
