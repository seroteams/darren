const path = require("node:path");
const { logFeedback } = require("../session");
const { cyan, dim } = require("../ui");
const { ROOT } = require("../paths");

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

  const logBase = path.relative(ROOT, session.dir).replace(/\\/g, "/");
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

module.exports = { collectRunRating };
