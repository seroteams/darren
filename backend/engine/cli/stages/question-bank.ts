import { generateBankWithFallback, assembleQueueWithPrepOpener, findPrepOpener } from "../../question-generator.ts";
import { selectReservedCloser } from "../../closer.ts";
import { writeJson, sessionFile } from "../io.ts";
import { dim, red, HR, withThinking } from "../../ui.ts";

import type { Question } from "../../../shared/question.types.ts";
import type { MeetingContext, PreparationResult } from "../../../shared/session.types.ts";

async function runQuestionBankStage({ ctx, focusPoints, meetingTypeLabel, introQueue, prep, session }: {
  ctx: MeetingContext;
  focusPoints: unknown;
  meetingTypeLabel: string;
  introQueue: Question[];
  prep: PreparationResult["brief"] | null;
  session: { dir: string };
}) {
  writeJson(sessionFile(session, "02-intro-questions/aliases.json"), {
    meeting_type: meetingTypeLabel,
    aliases: introQueue.map((q) => q.alias),
  });

  console.log();
  console.log(HR);
  const bank = await withThinking("Generating question bank", () =>
    generateBankWithFallback(
      { focusPoints, ...ctx, existingQueue: introQueue, prep },
      { session },
      {
        onFallback: (e) => {
          console.log("  " + red("Bank generation failed — falling back to seed bank."));
          console.log("  " + dim(e instanceof Error ? e.message : String(e)));
        },
      }
    )
  );

  const queue = assembleQueueWithPrepOpener(introQueue, bank, prep, ctx.meetingType);
  const prepOpener = prep ? findPrepOpener(bank) : null;

  const closer = selectReservedCloser(bank, meetingTypeLabel);
  if (closer) {
    console.log("  " + dim(`closer reserved: ${closer.alias} (stage: ${closer.stage})`));
  } else {
    console.log(
      "  " +
        dim("closer reserved: (none — no valid final-stage question; planner will generate one)")
    );
  }

  if (prepOpener) {
    console.log("  " + dim(`prep opener reserved: ${prepOpener.alias}`));
  }

  return { queue, closer, bank, prepOpener };
}

export { runQuestionBankStage };
