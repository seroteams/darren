const { generateBankWithFallback } = require("../../question-generator");
const { getArc } = require("../../meeting-arcs");
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

  const arc = getArc(meetingTypeLabel);
  const finalStageId = arc.arc[arc.arc.length - 1].id;
  const closerCandidates = bank.filter((q) => q.stage === finalStageId);
  const closer = closerCandidates.length ? closerCandidates[closerCandidates.length - 1] : null;
  if (closer) {
    console.log("  " + dim(`closer reserved: ${closer.alias} (stage: ${finalStageId})`));
  } else {
    console.log(
      "  " +
        dim(
          `closer reserved: (none — bank had no '${finalStageId}' question; planner will generate one)`
        )
    );
  }

  return { queue, closer, bank };
}

module.exports = { runQuestionBankStage };
