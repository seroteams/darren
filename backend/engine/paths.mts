// Address book — the single place that says where data lives on disk.
//
// Added in Phase 001 of the monorepo reorg so content paths stop being
// scattered across dozens of files. The product's content (prompts, questions,
// lexicons, scenarios, config, data, notes, axes.json, focus-points.json) lives
// under content/; engine/server/cli read it through the constants below.
// LOGS_DIR stays at the repo root; logs do not move in this phase.

import path from "node:path";

// backend/engine/paths.ts -> repo root is two levels up.
export const ROOT = path.join(import.meta.dirname, "..", "..");
export const CONTENT_DIR = path.join(ROOT, "content");
export const PROMPTS_DIR = path.join(CONTENT_DIR, "prompts");
export const QUESTIONS_DIR = path.join(CONTENT_DIR, "questions");
export const LEXICONS_DIR = path.join(CONTENT_DIR, "lexicons");
export const SCENARIOS_DIR = path.join(CONTENT_DIR, "scenarios");
export const CONFIG_DIR = path.join(CONTENT_DIR, "config");
export const DATA_DIR = path.join(CONTENT_DIR, "data");
export const NOTES_DIR = path.join(CONTENT_DIR, "notes");
export const AXES_FILE = path.join(CONTENT_DIR, "axes.json");
export const FOCUS_POINTS_FILE = path.join(CONTENT_DIR, "focus-points.json");
export const LOGS_DIR = path.join(ROOT, "logs");
