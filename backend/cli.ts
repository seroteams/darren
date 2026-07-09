import fs from "node:fs";
import path from "node:path";

import { loadEnv } from "./engine/env.ts";
import { createAsker } from "./engine/ask.ts";
import { MEETING_TYPES, INTRO_BUDGET, DYNAMIC_BUDGET } from "./engine/index.ts";
import { createSession } from "./engine/session.ts";
import { listRecentRuns, summarizeRun, deleteRun, findLatestRunWithLock } from "./engine/run-history.ts";
import { buildPipelineStatus } from "./engine/pipeline-lock.ts";
import { reviewSession as reviewLexiconSession } from "./engine/lexicon-reviewer.ts";
import { loadIntroQueue } from "./engine/intro-queue.ts";
import { ensureRoleProfile } from "./engine/role-profile.ts";
import { NOTES_DIR, ROOT } from "./engine/paths.mts";
import { runEnvironmentGuard } from "./db/env-guard.ts";
import { flushArtifactWrites } from "./db/run-artifacts-store.ts";
import { hydrateQuestionCache, flushQuestionWrites } from "./db/questions-store.ts";
import { hasDatabaseUrl } from "./db/client.ts";
import { closeDb } from "./db/client.ts";
import * as cost from "./engine/cost.ts";
import { runFocusPointsStage } from "./engine/cli/stages/focus-points.ts";
import { runPreparationStage } from "./engine/cli/stages/preparation.ts";
import { runQuestionBankStage } from "./engine/cli/stages/question-bank.ts";
import { runQuestioningLoop } from "./engine/cli/stages/questioning.ts";
import { runEvaluationStage, writeSessionCost } from "./engine/cli/stages/evaluation.ts";
import { collectRunRating } from "./engine/cli/run-rating.ts";
// run-debrief is an ES module (shared with the Vite browser build); loaded lazily in main().
import {
  bold,
  dim,
  cyan,
  cyanBold,
  yellow,
  red,
  HR,
} from "./engine/ui.ts";
import type { FocusPointsResult, MeetingContext } from "./shared/session.types.ts";

// The rich (has-baseline) shape of buildPipelineStatus().summary, all-optional so
// the defensive `|| 0` / `?.length` reads below stay valid when there's no baseline.
type PipelineSummary = Partial<
  Extract<ReturnType<typeof buildPipelineStatus>["summary"], { contentModified: number }>
>;

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
  const s: PipelineSummary = status.summary || {};
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
      const from = c?.from ? c.from.sha : "?";
      const to = c?.to ? c.to.sha : "?";
      console.log("  " + dim(`  · git: ${from} → ${to}${c?.to?.dirty ? " (dirty)" : ""}`));
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

  // Environment guard (postgres-runtime-data Phase 1): the CLI writes runs too, so
  // it gets the same live/local safety catch as the server. It does NOT auto-migrate
  // — a behind schema fails loudly with the db:migrate hint instead.
  try {
    await runEnvironmentGuard();
  } catch (e) {
    console.error(red(e instanceof Error ? e.message : String(e)));
    process.exit(1);
  }

  // Question pool hydration (postgres-runtime-data Phase 4): the CLI lane runs
  // the same engine, so it needs the same boot-hydrated cache in DB mode.
  if (hasDatabaseUrl()) {
    await hydrateQuestionCache();
  }

  const { ask, close: closeAsker } = createAsker();

  console.log();
  console.log("  " + cyanBold("Sero") + dim(" — 1:1 prep"));
  console.log(HR);

  try {
    const lines = fs
      .readFileSync(path.join(NOTES_DIR, "whats-new.md"), "utf8")
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
      const target = recent[idx];
      if (target) {
        const summary = summarizeRun(target.id);
        console.log();
        if (summary) console.log("  " + summary.overview);
        console.log("  " + dim("Resume from CLI not supported — open web app to continue."));
      }
      continue;
    }
    const delMatch = /^d\s+([1-3])$/.exec(choice);
    if (delMatch) {
      const idx = Number(delMatch[1]) - 1;
      const target = recent[idx];
      if (target) {
        const ans = (await ask(cyan(`  Delete "${target.headline}"? [y/N] `))).trim().toLowerCase();
        if (ans === "y") {
          deleteRun(target.id);
          console.log("  " + dim("Deleted."));
        }
      }
      continue;
    }
    console.log("  " + dim("Unrecognised — try [n], [1-3], or [d 1]."));
  }

  const session: ReturnType<typeof createSession> & { createdAt: number; completedAt: number | null } = {
    ...createSession(),
    createdAt: 0,
    completedAt: null,
  };
  session.createdAt = Date.now();
  const tracker = cost.createTracker();
  cost.setActive(tracker);

  console.log();
  const sessionRel = path.relative(ROOT, session.dir).replace(/\\/g, "/");
  console.log("  " + dim(`session ${session.id}`));
  console.log("  " + dim(`log → ${sessionRel}/`));
  console.log(HR);
  console.log();

  const name = await ask(cyan("  Their name?     "));
  const role = await ask(cyan("  Their role?     "));
  const seniority = await ask(cyan("  Seniority?      "));

  // Kicks off now so it runs while the user picks a meeting type and types
  // notes; awaited (with fallback) just before the pipeline needs it.
  const roleProfilePromise = ensureRoleProfile({ role, seniority }, { session }).catch((err: unknown) => ({
    status: "unavailable",
    key: null,
    doc: null,
    error: err instanceof Error ? err.message : String(err),
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

  let meetingType: (typeof MEETING_TYPES)[number] | null = null;
  while (!meetingType) {
    const pick = await ask(cyan(`  Pick a number (1-${MEETING_TYPES.length}): `));
    const idx = Number(pick) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < MEETING_TYPES.length) {
      meetingType = MEETING_TYPES[idx] ?? null;
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

  const ctx: MeetingContext = { name, role, seniority, meetingType: meetingType.label, notes };
  const result: FocusPointsResult = { meeting_type: "", focus_points: [] };

  const roleProfileOutcome = await roleProfilePromise;
  console.log("  " + dim(`role profile: ${roleProfileOutcome.status} (${roleProfileOutcome.key || "no key"})`));

  const focusOutcome = await runFocusPointsStage({ ctx, session, ask, result });
  if (!focusOutcome.continue) {
    console.log("  " + dim(`Log: ${path.relative(ROOT, session.dir).replace(/\\/g, "/")}/01-focus-points/`));
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
  console.log("  " + dim(`Log: ${path.relative(ROOT, session.dir).replace(/\\/g, "/")}/`));
  console.log();

  const { buildRunDebriefPayload, printRunDebrief } = await import("./engine/run-debrief.mjs");
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
    console.log("  " + dim(`lexicon review error: ${e instanceof Error ? e.message : String(e)}`));
  }

  await collectRunRating(ask, session);
  closeAsker();
}

main()
  .then(async () => {
    // Drain queued run-artifact + question writes before this short-lived process
    // exits, so a CLI run's data isn't lost to an early exit (postgres-runtime-data).
    await flushArtifactWrites();
    await flushQuestionWrites();
    await closeDb();
  })
  .catch((e: unknown) => {
    console.error(red(e instanceof Error ? e.message : String(e)));
    process.exit(1);
  });
