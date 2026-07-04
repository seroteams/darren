import path from "node:path";
import { PROMPTS_DIR } from "../../paths.mts";

// Repo-level prompts/ directory.

// Default ("house") prompt set every 1:1 Type inherits. A Type overrides a slot
// by setting its own absolute path (e.g. src/one-on-one-types/growth/prompts/final-evaluation.md).
// These point at the existing repo prompts/ files — single source, no duplication.
const SHARED_PROMPTS = {
  preparation: path.join(PROMPTS_DIR, "preparation.md"),
  focusPoints: path.join(PROMPTS_DIR, "generate-focus-points.md"),
  questionBank: path.join(PROMPTS_DIR, "generate-questions.md"),
  planTurn: path.join(PROMPTS_DIR, "plan-turn.md"),
  evaluation: path.join(PROMPTS_DIR, "final-evaluation.md"),
  lexicon: path.join(PROMPTS_DIR, "review-session-for-lexicon.md"),
};

export { PROMPTS_DIR, SHARED_PROMPTS };
