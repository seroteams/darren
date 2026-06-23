// Address book — the single place that says where data lives on disk.
//
// Added in Phase 001 step 2 of the monorepo reorg. It is intentionally
// UNUSED right now: step 2 only creates it. Step 3 moves the content roots
// into content/ AND repoints the engine/server/scripts to read through here,
// so the path strings stop being scattered across dozens of files.
//
// Today the data still sits at the repo root, so CONTENT_DIR === ROOT.
// In step 3, flip CONTENT_DIR to path.join(ROOT, "content") in lockstep with
// the actual `git mv` — that one line relocates every data root below.
// LOGS_DIR stays at the root; logs do not move in this phase.

const path = require("path");

// backend/engine/paths.js -> repo root is two levels up.
const ROOT = path.join(__dirname, "..", "..");
const CONTENT_DIR = ROOT; // step 3: -> path.join(ROOT, "content")

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
