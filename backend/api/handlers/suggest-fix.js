const fs = require("node:fs");
const path = require("node:path");

const { findRunDir } = require("../../engine/run-history");
const { suggestFix, stageInfo } = require("../../engine/prompt-fixer.ts");

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readState(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "session-state.json"), "utf8"));
  } catch {
    return null;
  }
}

// Per-turn questioning prompts are numbered (NN-prompt.md); grab the latest.
function readQuestioningPrompt(stageDir) {
  try {
    const files = fs.readdirSync(stageDir).filter((f) => /prompt\.md$/.test(f)).sort();
    const last = files[files.length - 1];
    return last ? readText(path.join(stageDir, last)) : null;
  } catch {
    return null;
  }
}

// Learning loop: assemble prompt + response + tester verdict, return a structured
// prompt-fix suggestion (display only — the tester applies it by hand).
module.exports = async function suggestFixHandler(c) {
  const body = await c.readBody();
  const { runId, stage = "evaluation" } = body;
  if (!runId) return c.error(Object.assign(new Error("runId required"), { status: 400 }));

  const dir = findRunDir(runId);
  if (!dir) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));

  const state = readState(dir);
  const verdict = state?.verdict || null;
  if (!verdict) {
    return c.error(Object.assign(new Error("no verdict on this run — record one first"), { status: 409 }));
  }

  const { dir: stageDirName } = stageInfo(stage);
  const stageDir = path.join(dir, stageDirName);
  const promptText =
    stage === "questioning"
      ? readQuestioningPrompt(stageDir)
      : readText(path.join(stageDir, "prompt.md"));
  const responseRaw = readText(path.join(stageDir, "response.json"));

  try {
    const fix = await suggestFix({
      stage,
      promptText,
      responseText: responseRaw,
      verdict,
      ctx: state?.ctx || null,
    });
    c.json(200, { fix });
  } catch (e) {
    console.warn("[suggest-fix] failed:", e.message);
    return c.error(Object.assign(new Error("fix suggestion failed: " + e.message), { status: 502 }));
  }
};
