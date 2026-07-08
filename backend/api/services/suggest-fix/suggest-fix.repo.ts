// Data access for the prompt-fix suggester — the storage seam, id-based + async
// (postgres-runtime-data Phase 3). `pgSuggestFixRepo` reads the session row +
// run_artifacts; `fileSuggestFixRepo` keeps the disk walk as the DB-less mode
// (findRunDir rejects traversal ids). The AI call itself is NOT here — it is
// injected into the service (a boundary, see suggest-fix.service.ts).

import fs from "node:fs";
import path from "node:path";
import { findRunDir } from "../../../engine/run-history.ts";
import { stageInfo } from "../../../engine/prompt-fixer.ts";
import { pgReadState, pgReadStageText } from "../../../db/runs-store.ts";
import { hasDatabaseUrl } from "../../../db/client.ts";
import { isObjectRecord } from "../../../shared/guards.ts";

export interface SuggestFixRepo {
  /** The run's saved state, or null when the run is unknown. */
  readState(runId: string): Promise<Record<string, unknown> | null>;
  readPrompt(runId: string, stage: string): Promise<string | null>;
  readResponse(runId: string, stage: string): Promise<string | null>;
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

// Per-turn questioning prompts are numbered (NN-prompt.md); grab the latest.
function readLatestNumbered(stageDir: string, suffix: string): string | null {
  try {
    const files = fs.readdirSync(stageDir).filter((f) => f.endsWith(suffix)).sort();
    const last = files[files.length - 1];
    return last ? readText(path.join(stageDir, last)) : null;
  } catch {
    return null;
  }
}

export const fileSuggestFixRepo: SuggestFixRepo = {
  readState: async (runId) => {
    const dir = findRunDir(runId);
    if (!dir) return null;
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, "session-state.json"), "utf8"));
      return isObjectRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  readPrompt: async (runId, stage) => {
    const dir = findRunDir(runId);
    if (!dir) return null;
    const stageDir = path.join(dir, stageInfo(stage).dir);
    return stage === "questioning" ? readLatestNumbered(stageDir, "prompt.md") : readText(path.join(stageDir, "prompt.md"));
  },
  readResponse: async (runId, stage) => {
    const dir = findRunDir(runId);
    if (!dir) return null;
    const stageDir = path.join(dir, stageInfo(stage).dir);
    return stage === "questioning"
      ? readLatestNumbered(stageDir, "response.json")
      : readText(path.join(stageDir, "response.json"));
  },
};

export const pgSuggestFixRepo: SuggestFixRepo = {
  readState: (runId) => pgReadState(runId),
  readPrompt: (runId, stage) =>
    pgReadStageText(runId, stageInfo(stage).dir, "prompt.md", stage === "questioning"),
  readResponse: (runId, stage) =>
    pgReadStageText(runId, stageInfo(stage).dir, "response.json", stage === "questioning"),
};

export const suggestFixRepo: SuggestFixRepo = hasDatabaseUrl() ? pgSuggestFixRepo : fileSuggestFixRepo;
