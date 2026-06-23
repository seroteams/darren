const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { PROMPTS_DIR, CONFIG_DIR } = require("./paths");

const MODELS_PATH = path.join(CONFIG_DIR, "models.json");

function shortHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

// Hash over all prompt template files. Changes whenever any prompt is edited
// (committed or not), so two runs can be told apart by which prompts produced them.
function promptsVersion() {
  try {
    const files = fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".md")).sort();
    const blob = files.map((f) => f + ":" + fs.readFileSync(path.join(PROMPTS_DIR, f), "utf8")).join("\n");
    return shortHash(blob);
  } catch {
    return "unknown";
  }
}

function modelConfigVersion() {
  try {
    return shortHash(fs.readFileSync(MODELS_PATH, "utf8"));
  } catch {
    return "unknown";
  }
}

// Build the run fingerprint stamped onto each session/run so Compare can show
// why two runs differ. `mode`, `runLabel`, `personaId`, `scriptVersion` are
// run inputs; the two version hashes are computed from the live files.
function buildFingerprint({ mode, runLabel, personaId, scriptVersion } = {}) {
  return {
    mode: mode || "manual",
    runLabel: runLabel || null,
    personaId: personaId || null,
    scriptVersion: scriptVersion || null,
    promptVersion: promptsVersion(),
    modelConfigVersion: modelConfigVersion(),
  };
}

module.exports = { buildFingerprint, promptsVersion, modelConfigVersion };
