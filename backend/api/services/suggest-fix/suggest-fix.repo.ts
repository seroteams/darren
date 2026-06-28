// Data access for the prompt-fix suggester — the storage seam. Locates a finished
// run's dir (findRunDir rejects traversal ids), reads its saved session-state and
// the chosen stage's prompt/response off disk. The AI call itself is NOT here — it
// is injected into the service (a boundary, see suggest-fix.service.ts), the way
// the regression domain injects its runner. A DB-backed impl can replace
// `fileSuggestFixRepo` without touching the service.

import fs from "node:fs";
import path from "node:path";
import { findRunDir } from "../../../engine/run-history.ts";
import { stageInfo } from "../../../engine/prompt-fixer.ts";
import { isObjectRecord } from "../../../shared/guards.ts";

export interface SuggestFixRepo {
  findRunDir(runId: string): string | null;
  readState(dir: string): Record<string, unknown> | null;
  readPrompt(dir: string, stage: string): string | null;
  readResponse(dir: string, stage: string): string | null;
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
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

export const fileSuggestFixRepo: SuggestFixRepo = {
  findRunDir: (runId) => findRunDir(runId),
  readState: (dir) => {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, "session-state.json"), "utf8"));
      return isObjectRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  readPrompt: (dir, stage) => {
    const stageDir = path.join(dir, stageInfo(stage).dir);
    return stage === "questioning" ? readQuestioningPrompt(stageDir) : readText(path.join(stageDir, "prompt.md"));
  },
  readResponse: (dir, stage) => readText(path.join(dir, stageInfo(stage).dir, "response.json")),
};
