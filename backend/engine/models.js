const fs = require("node:fs");
const path = require("node:path");
const { CONFIG_DIR } = require("./paths");

const CONFIG_PATH = path.join(CONFIG_DIR, "models.json");
const FALLBACK_MODEL = "gpt-4o-mini";

const STAGES = ["focus_points", "preparation", "bank", "planner", "evaluation", "role_profile"];

let _config = null;

function loadConfig() {
  if (_config) return _config;
  try {
    _config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    _config = {};
  }
  return _config;
}

// Resolution order for `stage`:
//   1. stage-specific env var override (OPENAI_MODEL_<STAGE>)   — ad-hoc
//   2. config/models.json entry                                  — canonical
//   3. OPENAI_MODEL env var                                      — catch-all
//   4. hard-coded fallback (gpt-4o-mini)
function modelFor(stage) {
  const envKey = `OPENAI_MODEL_${stage.toUpperCase()}`;
  if (process.env[envKey]) return process.env[envKey];
  const cfg = loadConfig();
  if (cfg[stage]) return cfg[stage];
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL;
  return FALLBACK_MODEL;
}

function allResolved() {
  const out = {};
  for (const s of STAGES) out[s] = modelFor(s);
  return out;
}

module.exports = { modelFor, allResolved, STAGES, FALLBACK_MODEL };
