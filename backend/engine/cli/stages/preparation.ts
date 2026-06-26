import { generatePreparation } from "../../preparation.ts";
import { bold, dim, cyan, magentaBold, gray, yellow, HR, withThinking } from "../../ui.ts";

import type { MeetingContext, PreparationResult } from "../../../shared/session.types.ts";

async function runPreparationStage({ ctx, focusPoints, session }: {
  ctx: MeetingContext;
  focusPoints: unknown;
  session: { dir: string };
}): Promise<PreparationResult> {
  console.log();
  console.log(HR);

  const prepResult = await withThinking("Preparing your briefing", () =>
    generatePreparation(
      {
        name: ctx.name,
        role: ctx.role,
        seniority: ctx.seniority,
        meetingType: ctx.meetingType,
        notes: ctx.notes,
        focusPoints: Array.isArray(focusPoints) ? focusPoints : undefined,
      },
      { session }
    )
  );

  renderPreparationBrief(prepResult.brief, prepResult.validation);

  return prepResult;
}

function renderPreparationBrief(
  prep: PreparationResult["brief"],
  validation: { passed: boolean; issues: string[] }
): void {
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
  (prep.listenFor || []).forEach((item) => console.log(`  ${dim("–")} ${item}`));
  console.log();

  console.log("  " + bold("Avoid"));
  (prep.avoid || []).forEach((item) => console.log(`  ${dim("–")} ${item}`));
  console.log();

  console.log("  " + bold("Good outcome"));
  console.log("  " + gray(prep.goodOutcome));
  console.log();

  console.log("  " + bold("Suggested action to agree"));
  console.log("  " + gray(prep.suggestedAction));
  console.log();

  if (!validation.passed) {
    console.log("  " + yellow("⚠ Validation warnings:"));
    validation.issues.forEach((issue) => console.log("  " + dim(`  · ${issue}`)));
    console.log();
  }

  console.log(HR);
  console.log();
}

export { runPreparationStage, renderPreparationBrief };
