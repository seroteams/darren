// Address book — the single place that says where data lives on disk.
//
// Added in Phase 001 of the monorepo reorg so content paths stop being
// scattered across dozens of files. The product's content (prompts, questions,
// lexicons, scenarios, config, data, notes, axes.json, focus-points.json) lives
// under content/; engine/server/cli read it through the constants below.
// LOGS_DIR stays at the repo root; logs do not move in this phase.

const path = require("path");

// backend/engine/paths.js -> repo root is two levels up.
const ROOT = path.join(__dirname, "..", "..");
const CONTENT_DIR = path.join(ROOT, "content");

module.exports = {
  ROOT,
  CONTENT_DIR,
  PROMPTS_DIR: path.join(CONTENT_DIR, "prompts"),
  QUESTIONS_DIR: path.join(CONTENT_DIR, "questions"),
  LEXICONS_DIR: path.join(CONTENT_DIR, "lexicons"),
  SCENARIOS_DIR: path.join(CONTENT_DIR, "scenarios"),
  CONFIG_DIR: path.join(CONTENT_DIR, "config"),
  DATA_DIR: path.join(CONTENT_DIR, "data"),
  NOTES_DIR: path.join(CONTENT_DIR, "notes"),
  AXES_FILE: path.join(CONTENT_DIR, "axes.json"),
  FOCUS_POINTS_FILE: path.join(CONTENT_DIR, "focus-points.json"),
  LOGS_DIR: path.join(ROOT, "logs"),
};
