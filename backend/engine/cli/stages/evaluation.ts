import { evaluate } from "../../reviewer.ts";
import { serialize } from "../../axes.ts";
import * as cost from "../../cost.ts";
import { renderBriefing } from "../../briefing.ts";
import { logRunRoot } from "../../session.ts";
import { bold, dim, yellow, HR, pad, withThinking } from "../../ui.ts";

import type { MeetingContext, AxisState, TranscriptEntry } from "../../../shared/session.types.ts";
import type { CostTracker, CostSummary } from "../../../shared/cost.types.ts";

async function runEvaluationStage({ ctx, focusPoints, transcript, axisState, notes, scoring, session, name }: {
  ctx: MeetingContext;
  focusPoints: unknown;
  transcript: TranscriptEntry[];
  axisState: AxisState;
  notes?: string;
  scoring?: { failures?: number; scoredTurns?: number };
  session: { dir: string };
  name: string;
}) {
  console.log(HR);
  const finalEval = await withThinking("Final evaluation", () =>
    evaluate(
      {
        ctx,
        focusPoints,
        transcript: transcript.map((t) => ({
          question: t.question.name,
          alias: t.question.alias,
          stage: t.question.stage,
          answer: t.answer,
          skipped: t.skipped,
          note: t.note || "",
          unbooked_signal: t.unbooked_signal || [],
        })),
        axisState: serialize(axisState),
        notes,
        scoring,
      },
      { session }
    )
  );

  console.log(HR);
  console.log();
  renderBriefing(finalEval, name);

  return finalEval;
}

function renderSessionCost(finalCost: CostSummary): void {
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
      dim(" out") +
      (finalCost.cached_tokens ? dim(`, ${cost.formatTokens(finalCost.cached_tokens)} cached`) : "") +
      dim(")")
  );
  const perStage: Record<string, { n: number; usd: number; tok: number }> = {};
  for (const c of finalCost.calls) {
    if (!perStage[c.stage]) perStage[c.stage] = { n: 0, usd: 0, tok: 0 };
    const entry = perStage[c.stage];
    if (!entry) continue;
    entry.n += 1;
    if (c.known_price && c.usd_cost != null) entry.usd += c.usd_cost;
    entry.tok += c.prompt_tokens + c.completion_tokens;
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
    console.log(
      "  " +
        yellow(`⚠ ${finalCost.unknown_price_calls} API call(s) used an unrecognised model — cost total is understated`)
    );
  }
}

function writeSessionCost(session: { dir: string }, tracker: CostTracker): void {
  const finalCost = tracker.summary();
  logRunRoot(session, "cost.json", finalCost);
  renderSessionCost(finalCost);
}

export { runEvaluationStage, writeSessionCost, renderSessionCost };
