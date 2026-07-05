// Data access for the heartbeat — raw reads from the repo the server is running
// from: the stage files on disk, package.json scripts, axes config, the question
// index. Everything is read fresh per request (the point is "what's true NOW");
// all shaping/narrowing lives in the service.

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../../engine/paths.mts";
import { isObjectRecord } from "../../../shared/guards.ts";

const STAGES_DIR = path.join(ROOT, "admin", "src", "stages");
const HEAD_BYTES = 2048; // plenty for a header comment, cheap for 30 files

export interface HeartbeatRepo {
  stageFileNames(): string[];
  stageFileHead(file: string): string;
  scriptNames(): string[];
  axesRaw(): unknown;
  questionCountRaw(): unknown;
}

function readJson(rel: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch {
    return null;
  }
}

export const fileHeartbeatRepo: HeartbeatRepo = {
  stageFileNames: () => {
    try {
      return fs.readdirSync(STAGES_DIR);
    } catch {
      return [];
    }
  },
  stageFileHead: (file) => {
    try {
      const fd = fs.openSync(path.join(STAGES_DIR, file), "r");
      try {
        const buf = Buffer.alloc(HEAD_BYTES);
        const n = fs.readSync(fd, buf, 0, HEAD_BYTES, 0);
        return buf.toString("utf8", 0, n);
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return "";
    }
  },
  scriptNames: () => {
    const pkg = readJson("package.json");
    const scripts = isObjectRecord(pkg) ? pkg.scripts : null;
    return isObjectRecord(scripts) ? Object.keys(scripts) : [];
  },
  axesRaw: () => readJson(path.join("content", "axes.json")),
  questionCountRaw: () => readJson(path.join("content", "questions", "_index.json")),
};
