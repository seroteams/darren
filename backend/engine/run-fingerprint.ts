import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PROMPTS_DIR, CONFIG_DIR } from "./paths.mts";
import type { RunFingerprint } from "../shared/session.types.ts";

const MODELS_PATH = path.join(CONFIG_DIR, "models.json");

function shortHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

// Hash over all prompt template files. Changes whenever any prompt is edited
// (committed or not), so two runs can be told apart by which prompts produced them.
function promptsVersion(): string {
  try {
    const files = fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".md")).sort();
    const blob = files.map((f) => f + ":" + fs.readFileSync(path.join(PROMPTS_DIR, f), "utf8")).join("\n");
    return shortHash(blob);
  } catch {
    return "unknown";
  }
}

function modelConfigVersion(): string {
  try {
    return shortHash(fs.readFileSync(MODELS_PATH, "utf8"));
  } catch {
    return "unknown";
  }
}

interface FingerprintInputs {
  mode?: "manual" | "scripted";
  runLabel?: string | null;
  personaId?: string | null;
  scriptVersion?: string | null;
}

// Build the run fingerprint stamped onto each session/run so Compare can show
// why two runs differ. `mode`, `runLabel`, `personaId`, `scriptVersion` are
// run inputs; the two version hashes are computed from the live files.
export function buildFingerprint({
  mode,
  runLabel,
  personaId,
  scriptVersion,
}: FingerprintInputs = {}): RunFingerprint {
  return {
    mode: mode || "manual",
    runLabel: runLabel || null,
    personaId: personaId || null,
    scriptVersion: scriptVersion || null,
    promptVersion: promptsVersion(),
    modelConfigVersion: modelConfigVersion(),
  };
}

export { promptsVersion, modelConfigVersion };
