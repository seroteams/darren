import fs from "node:fs";
import path from "node:path";

import { findRunDir } from "../../engine/run-history.ts";
import { suggestFix, stageInfo } from "../../engine/prompt-fixer.ts";
import type { RequestContext } from "../router.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readState(dir: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, "session-state.json"), "utf8"));
    return isObjectRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Per-turn questioning prompts are numbered (NN-prompt.md); grab the latest.
function readQuestioningPrompt(stageDir: string): string | null {
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
export default async function suggestFixHandler(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const runId = asString(body.runId);
  const stage = typeof body.stage === "string" ? body.stage : "evaluation";
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
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[suggest-fix] failed:", msg);
    return c.error(Object.assign(new Error("fix suggestion failed: " + msg), { status: 502 }));
  }
}
