// Heartbeat logic: turn raw repo reads into the "what the app looks like right
// now" snapshot the Guide page renders and diffs against. Pure — all disk access
// goes through the repo, the build id is injected.

import type { BuildInfo } from "../../build-info.ts";
import type { HeartbeatRepo } from "./heartbeat.repo.ts";
import { isObjectRecord } from "../../../shared/guards.ts";

export interface HeartbeatScreen {
  file: string;
  desc: string; // the file's own header-comment first sentence — never hand-written here
}

export interface HeartbeatBody {
  build: string;
  committedAt: string | null;
  screens: HeartbeatScreen[];
  commands: string[];
  axes: Array<{ id: string; label: string }>;
  questionCount: number | null;
}

export interface HeartbeatService {
  snapshot(): HeartbeatBody;
}

// A screen is a plain .js/.ts stage module — not a test, a declaration, or the
// shared types file.
export function isScreenFile(name: string): boolean {
  if (!/\.(js|ts)$/.test(name)) return false;
  if (/\.test\.(js|ts)$/.test(name)) return false;
  if (name.endsWith(".d.ts")) return false;
  if (name === "stage.types.ts") return false;
  return true;
}

const MAX_DESC = 160;

// First sentence of the file's leading // comment block, or "" when the file
// starts with code. Wrapped comment lines are joined before the sentence cut.
export function headerLine(head: string): string {
  const lines: string[] = [];
  for (const raw of head.split("\n")) {
    const m = raw.match(/^\s*\/\/\s?(.*)$/);
    if (!m) break;
    lines.push((m[1] ?? "").trim());
  }
  const joined = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!joined) return "";
  const sentence = joined.match(/^(.*?\.)(\s|$)/);
  const out = sentence?.[1] ?? joined;
  return out.length > MAX_DESC ? out.slice(0, MAX_DESC) + "…" : out;
}

function narrowAxes(raw: unknown): Array<{ id: string; label: string }> {
  if (!isObjectRecord(raw) || !Array.isArray(raw.axes)) return [];
  const out: Array<{ id: string; label: string }> = [];
  for (const a of raw.axes) {
    if (isObjectRecord(a) && typeof a.id === "string" && typeof a.label === "string") {
      out.push({ id: a.id, label: a.label });
    }
  }
  return out;
}

export function createHeartbeatService(
  repo: HeartbeatRepo,
  buildInfo: () => BuildInfo
): HeartbeatService {
  return {
    snapshot() {
      const screens = repo
        .stageFileNames()
        .filter(isScreenFile)
        .sort()
        .map((file) => ({ file, desc: headerLine(repo.stageFileHead(file)) }));
      const countRaw = repo.questionCountRaw();
      const questionCount =
        isObjectRecord(countRaw) && typeof countRaw.count === "number" ? countRaw.count : null;
      const { build, committedAt } = buildInfo();
      return {
        build,
        committedAt,
        screens,
        commands: repo.scriptNames(),
        axes: narrowAxes(repo.axesRaw()),
        questionCount,
      };
    },
  };
}
