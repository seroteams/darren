const path = require("node:path");

// Repo-level prompts/ directory. __dirname = src/one-on-one-types/_shared
const PROMPTS_DIR = path.join(__dirname, "..", "..", "..", "prompts");

// Default ("house") prompt set every 1:1 Type inherits. A Type overrides a slot
// by setting its own absolute path (e.g. src/one-on-one-types/growth/prompts/final-evaluation.md).
// These point at the existing repo prompts/ files — single source, no duplication.
const SHARED_PROMPTS = {
  preparation: path.join(PROMPTS_DIR, "preparation.md"),
  focusPoints: path.join(PROMPTS_DIR, "generate-focus-points.md"),
  questionBank: path.join(PROMPTS_DIR, "generate-questions.md"),
  planTurn: path.join(PROMPTS_DIR, "plan-turn.md"),
  evaluation: path.join(PROMPTS_DIR, "final-evaluation.md"),
  productQa: path.join(PROMPTS_DIR, "product-qa-report.md"),
  lexicon: path.join(PROMPTS_DIR, "review-session-for-lexicon.md"),
};

module.exports = { PROMPTS_DIR, SHARED_PROMPTS };
