import fs from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "./paths.mts";

const CONFIG_PATH = path.join(CONFIG_DIR, "models.json");
const FALLBACK_MODEL = "gpt-4o-mini";

const STAGES = ["focus_points", "preparation", "bank", "planner", "evaluation", "role_profile"];

let _config: Record<string, string> | null = null;

function loadConfig(): Record<string, string> {
  if (_config) return _config;
  try {
    _config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    _config = {};
  }
  return _config ?? {};
}

// Resolution order for `stage`:
//   1. stage-specific env var override (OPENAI_MODEL_<STAGE>)   — ad-hoc
//   2. config/models.json entry                                  — canonical
//   3. OPENAI_MODEL env var                                      — catch-all
//   4. hard-coded fallback (gpt-4o-mini)
function modelFor(stage: string): string {
  const envKey = `OPENAI_MODEL_${stage.toUpperCase()}`;
  const envOverride = process.env[envKey];
  if (envOverride) return envOverride;
  const cfg = loadConfig();
  const fromCfg = cfg[stage];
  if (fromCfg) return fromCfg;
  const envModel = process.env.OPENAI_MODEL;
  if (envModel) return envModel;
  return FALLBACK_MODEL;
}

function allResolved(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of STAGES) out[s] = modelFor(s);
  return out;
}

export { modelFor, allResolved, STAGES, FALLBACK_MODEL };
