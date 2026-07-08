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

// One unfinished plan folder under docs/plans/doing/, as read from its PLAN.md.
export interface TodoPlan {
  slug: string;
  title: string;
  done: number; // ✅ phase rows
  inProgress: number; // 🔨 phase rows
  total: number; // all status-bearing phase rows
  state: string; // first paragraph under "## Current state", plain text
}

export interface TodoStatus {
  active: TodoPlan[]; // plans still in docs/plans/doing/ (not archived)
  done: string[]; // slugs sitting in docs/plans/done/
}

export interface HeartbeatBody {
  build: string;
  committedAt: string | null;
  screens: HeartbeatScreen[];
  commands: string[];
  axes: Array<{ id: string; label: string }>;
  questionCount: number | null;
  todos: TodoStatus;
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

// Strip the light markdown a PLAN.md line carries, leaving plain reading text.
function stripMd(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// The plan's title = its first `# ` heading; falls back to the slug.
export function planTitle(text: string, slug: string): string {
  for (const line of text.split("\n")) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) return stripMd(m[1] ?? "");
  }
  return slug;
}

// Tally phase rows from the plan's status table. A phase row is a table line
// (starts with "|") carrying exactly one status glyph — so the legend line
// (which lists all three) and header rows are ignored.
export function countPhases(text: string): { done: number; inProgress: number; total: number } {
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const hasDone = line.includes("✅");
    const hasProg = line.includes("🔨");
    const hasTodo = line.includes("⬜");
    if ((hasDone ? 1 : 0) + (hasProg ? 1 : 0) + (hasTodo ? 1 : 0) !== 1) continue;
    if (hasDone) done++;
    else if (hasProg) inProgress++;
    else notStarted++;
  }
  return { done, inProgress, total: done + inProgress + notStarted };
}

const MAX_STATE = 220;

// The first paragraph under a "## Current state" heading, as plain text.
export function currentState(text: string): string {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => /^##\s+current state/i.test(l.trim()));
  if (i < 0) return "";
  const para: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    const l = (lines[j] ?? "").trim();
    if (l.startsWith("## ")) break;
    if (!l) {
      if (para.length) break;
      continue;
    }
    para.push(l);
  }
  const out = stripMd(para.join(" "));
  return out.length > MAX_STATE ? out.slice(0, MAX_STATE) + "…" : out;
}

function buildTodos(repo: HeartbeatRepo): TodoStatus {
  const active = repo
    .todoSlugs()
    .sort()
    .map((slug) => {
      const text = repo.planText(slug);
      const { done, inProgress, total } = countPhases(text);
      return { slug, title: planTitle(text, slug), done, inProgress, total, state: currentState(text) };
    });
  return { active, done: repo.doneSlugs().sort() };
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
        todos: buildTodos(repo),
      };
    },
  };
}
