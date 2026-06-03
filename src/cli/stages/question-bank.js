const { generateBankWithFallback } = require("../../question-generator");
const { selectReservedCloser } = require("../../closer");
const { writeJson, sessionFile } = require("../io");
const { dim, red, HR, withThinking } = require("../../ui");

async function runQuestionBankStage({ ctx, focusPoints, meetingTypeLabel, introQueue, session }) {
  writeJson(sessionFile(session, "02-intro-questions/aliases.json"), {
    meeting_type: meetingTypeLabel,
    aliases: introQueue.map((q) => q.alias),
  });

  console.log();
  console.log(HR);
  const bank = await withThinking("Generating question bank", () =>
    generateBankWithFallback(
      { focusPoints, ...ctx, existingQueue: introQueue },
      { session },
      {
        onFallback: (e) => {
          console.log("  " + red("Bank generation failed — falling back to seed bank."));
          console.log("  " + dim(e.message));
        },
      }
    )
  );

  const queue = [...introQueue, ...bank];

  const closer = selectReservedCloser(bank, meetingTypeLabel);
  if (closer) {
    console.log("  " + dim(`closer reserved: ${closer.alias} (stage: ${closer.stage})`));
  } else {
    console.log(
      "  " +
        dim("closer reserved: (none — no valid final-stage question; planner will generate one)")
    );
  }

  return { queue, closer, bank };
}

module.exports = { runQuestionBankStage };
