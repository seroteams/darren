import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

import { CONTENT_DIR, ROOT } from "./paths.mts";
import { allResolved } from "./models.ts";

const LOCK_FILE = "pipeline-lock.json";

type Tier = "content" | "engine";
type ChangeKind = "added" | "removed" | "modified";

interface PathMeta {
  tier: Tier;
  stageLabel: string;
}

interface FileHash {
  sha256: string;
  bytes: number;
  mtimeMs: number;
}

interface GitInfo {
  sha: string;
  branch: string;
  dirty: boolean;
}

interface PipelineLock {
  version: number;
  capturedAt: number;
  packageVersion: string;
  git: GitInfo | null;
  models: Record<string, string>;
  files: Record<string, FileHash>;
  aggregates: {
    content: string;
    engine: string;
    all: string;
  };
}

interface FileChange {
  path: string;
  tier: Tier;
  stageLabel: string;
  kind: ChangeKind;
  before: FileHash | null;
  after: FileHash | null;
}

interface ModelChange {
  stage: string;
  from: string | null;
  to: string | null;
  kind: "modified";
}

interface GitChange {
  kind: "modified";
  from: GitInfo | null;
  to: GitInfo | null;
}

interface DiffSummary {
  contentModified: number;
  contentAdded: number;
  contentRemoved: number;
  engineModified: number;
  engineAdded: number;
  engineRemoved: number;
  modelsChanged: string[];
  gitChanged: boolean;
}

type DiffGroup =
  | { id: "content" | "engine"; title: string; subtitle?: string; changes: FileChange[] }
  | { id: "models"; title: string; subtitle?: string; changes: ModelChange[] }
  | { id: "git"; title: string; subtitle?: string; changes: GitChange[] };

interface DiffResult {
  unchanged: boolean;
  hasBaseline: boolean;
  summary: DiffSummary | Record<string, never>;
  changes: FileChange[];
  groups: DiffGroup[];
  changelogMarkdown: string;
}

const PATH_META: Record<string, PathMeta> = {
  "prompts/generate-focus-points.md": { tier: "content", stageLabel: "Focus points" },
  "prompts/preparation.md": { tier: "content", stageLabel: "Preparation" },
  "prompts/generate-questions.md": { tier: "content", stageLabel: "Question bank" },
  "prompts/plan-turn.md": { tier: "content", stageLabel: "Questioning (planner)" },
  "prompts/final-evaluation.md": { tier: "content", stageLabel: "Evaluation / briefing" },
  "prompts/review-session-for-lexicon.md": { tier: "content", stageLabel: "Lexicon review" },
  "focus-points.json": { tier: "content", stageLabel: "Focus points catalogue" },
  "axes.json": { tier: "content", stageLabel: "Axis scoring" },
  "questions/_index.json": { tier: "content", stageLabel: "Question index" },
  "questions/_openers.json": { tier: "content", stageLabel: "Openers" },
  "config/models.json": { tier: "content", stageLabel: "Model config file" },
  "backend/engine/generate.js": { tier: "engine", stageLabel: "Focus points" },
  "backend/engine/preparation.js": { tier: "engine", stageLabel: "Preparation" },
  "backend/engine/question-generator.js": { tier: "engine", stageLabel: "Question bank" },
  "backend/engine/queue-manager.js": { tier: "engine", stageLabel: "Questioning (planner)" },
  "backend/engine/reviewer.js": { tier: "engine", stageLabel: "Evaluation" },
  "backend/engine/axes.js": { tier: "engine", stageLabel: "Axis scoring" },
  "backend/engine/questions.js": { tier: "engine", stageLabel: "Questions" },
  "backend/engine/opener.js": { tier: "engine", stageLabel: "Openers" },
  "backend/engine/intro-queue.js": { tier: "engine", stageLabel: "Intro queue" },
  "backend/engine/meeting-arcs.js": { tier: "engine", stageLabel: "Meeting arc" },
  "backend/engine/meeting-types.js": { tier: "engine", stageLabel: "Meeting types" },
  "backend/engine/lexicon.js": { tier: "engine", stageLabel: "Lexicon" },
  "backend/engine/ai-client.js": { tier: "engine", stageLabel: "AI client" },
  "backend/engine/models.js": { tier: "engine", stageLabel: "Models" },
  "backend/engine/lexicon/review-core.js": { tier: "engine", stageLabel: "Lexicon review" },
  "backend/engine/lexicon/candidates-io.js": { tier: "engine", stageLabel: "Lexicon candidates" },
  "backend/api/sessions.js": { tier: "engine", stageLabel: "Sessions" },
  "backend/api/session-persistence.js": { tier: "engine", stageLabel: "Session persistence" },
  "backend/api/handlers/start.js": { tier: "engine", stageLabel: "Start" },
  "backend/api/handlers/focus-points.js": { tier: "engine", stageLabel: "Focus points" },
  "backend/api/handlers/preparation.js": { tier: "engine", stageLabel: "Preparation" },
  "backend/api/handlers/bank.js": { tier: "engine", stageLabel: "Question bank" },
  "backend/api/handlers/plan.js": { tier: "engine", stageLabel: "Questioning (planner)" },
  "backend/api/handlers/question.js": { tier: "engine", stageLabel: "Question" },
  "backend/api/handlers/answer.js": { tier: "engine", stageLabel: "Answer" },
  "backend/api/handlers/evaluation.js": { tier: "engine", stageLabel: "Evaluation" },
  "backend/api/handlers/lexicon.js": { tier: "engine", stageLabel: "Lexicon" },
  "backend/api/handlers/stream-helper.js": { tier: "engine", stageLabel: "Streaming" },
};

let scanCache: PipelineLock | null = null;
let scanCacheAt = 0;
const SCAN_CACHE_MS = 2000;

function shouldSkipRel(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  return n.includes("/_candidates/") || n.includes("\\_candidates\\");
}

function walkYamlDir(absDir: string, relPrefix: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(absDir)) return out;
  const stack: { abs: string; rel: string }[] = [{ abs: absDir, rel: relPrefix }];
  while (stack.length) {
    const top = stack.pop();
    if (!top) break;
    const { abs, rel } = top;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (shouldSkipRel(relPath)) continue;
      const absPath = path.join(abs, e.name);
      if (e.isDirectory()) {
        stack.push({ abs: absPath, rel: relPath });
      } else if (e.isFile() && e.name.endsWith(".yaml")) {
        out.push(relPath);
      }
    }
  }
  return out.sort();
}

function listManifestPaths(): string[] {
  const paths = new Set(Object.keys(PATH_META));
  for (const rel of walkYamlDir(path.join(CONTENT_DIR, "questions"), "questions")) {
    paths.add(rel);
    if (!PATH_META[rel]) {
      PATH_META[rel] = { tier: "content", stageLabel: "Question seeds" };
    }
  }
  for (const rel of walkYamlDir(path.join(CONTENT_DIR, "lexicons"), "lexicons")) {
    paths.add(rel);
    if (!PATH_META[rel]) {
      PATH_META[rel] = { tier: "content", stageLabel: "Conversation lexicon" };
    }
  }
  return [...paths].sort();
}

function hashFile(absPath: string): FileHash {
  const buf = fs.readFileSync(absPath);
  const stat = fs.statSync(absPath);
  return {
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    bytes: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function tierAggregate(files: Record<string, FileHash>, tier: Tier): string {
  const lines = Object.entries(files)
    .filter(([p]) => PATH_META[p]?.tier === tier)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([p, h]) => `${p}:${h.sha256}`);
  if (lines.length === 0) return crypto.createHash("sha256").update("").digest("hex");
  return crypto.createHash("sha256").update(lines.join("\n")).digest("hex");
}

function readPackageVersion(): string {
  try {
    const pkg: { version?: string } = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    );
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readGitInfo(): GitInfo | null {
  try {
    const sha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
    let branch = "HEAD";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
    } catch {}
    let dirty = false;
    try {
      const status = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" }).trim();
      dirty = status.length > 0;
    } catch {}
    return { sha: sha.slice(0, 12), branch, dirty };
  } catch {
    return null;
  }
}

function capturePipelineLock(): PipelineLock {
  const files: Record<string, FileHash> = {};
  for (const rel of listManifestPaths()) {
    const abs = path.join(CONTENT_DIR, rel);
    if (!fs.existsSync(abs)) continue;
    try {
      files[rel] = hashFile(abs);
    } catch {
      // skip unreadable
    }
  }
  const models = allResolved();
  const git = readGitInfo();
  const contentHash = tierAggregate(files, "content");
  const engineHash = tierAggregate(files, "engine");
  const allPayload = [
    contentHash,
    engineHash,
    JSON.stringify(models),
    git ? JSON.stringify(git) : "",
  ].join("|");
  const aggregates = {
    content: contentHash,
    engine: engineHash,
    all: crypto.createHash("sha256").update(allPayload).digest("hex"),
  };

  return {
    version: 1,
    capturedAt: Date.now(),
    packageVersion: readPackageVersion(),
    git,
    models,
    files,
    aggregates,
  };
}

function writePipelineLock(sessionDir: string): PipelineLock {
  const lock = capturePipelineLock();
  fs.writeFileSync(path.join(sessionDir, LOCK_FILE), JSON.stringify(lock, null, 2));
  return lock;
}

function readPipelineLockFromDir(runDir: string): PipelineLock | null {
  const filePath = path.join(runDir, LOCK_FILE);
  if (!fs.existsSync(filePath)) return null;
  try {
    const lock: PipelineLock = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return lock;
  } catch {
    return null;
  }
}

function scanPipelineNow(): PipelineLock {
  const now = Date.now();
  if (scanCache && now - scanCacheAt < SCAN_CACHE_MS) return scanCache;
  scanCache = capturePipelineLock();
  scanCacheAt = now;
  return scanCache;
}

function diffLocks(baseline: PipelineLock | null, current: PipelineLock): DiffResult {
  if (!baseline) {
    return {
      unchanged: false,
      hasBaseline: false,
      summary: {},
      changes: [],
      groups: [],
      changelogMarkdown: "",
    };
  }

  const changes: FileChange[] = [];
  const baseFiles = baseline.files || {};
  const curFiles = current.files || {};
  const allPaths = new Set([...Object.keys(baseFiles), ...Object.keys(curFiles)]);

  for (const p of [...allPaths].sort()) {
    const before = baseFiles[p];
    const after = curFiles[p];
    const meta: PathMeta = PATH_META[p] || { tier: "content", stageLabel: p };
    let kind: ChangeKind;
    if (before && !after) kind = "removed";
    else if (!before && after) kind = "added";
    else if (before && after && before.sha256 !== after.sha256) kind = "modified";
    else continue;
    changes.push({
      path: p,
      tier: meta.tier,
      stageLabel: meta.stageLabel,
      kind,
      before: before || null,
      after: after || null,
    });
  }

  const modelChanges: ModelChange[] = [];
  const baseModels = baseline.models || {};
  const curModels = current.models || {};
  for (const stage of new Set([...Object.keys(baseModels), ...Object.keys(curModels)])) {
    const from = baseModels[stage];
    const to = curModels[stage];
    if (from !== to) {
      modelChanges.push({ stage, from: from || null, to: to || null, kind: "modified" });
    }
  }

  const gitChanged =
    JSON.stringify(baseline.git || null) !== JSON.stringify(current.git || null);

  const contentChanges = changes.filter((c) => c.tier === "content");
  const engineChanges = changes.filter((c) => c.tier === "engine");

  const unchanged =
    contentChanges.length === 0 &&
    engineChanges.length === 0 &&
    modelChanges.length === 0 &&
    !gitChanged &&
    baseline.aggregates?.all === current.aggregates?.all;

  const summary: DiffSummary = {
    contentModified: contentChanges.filter((c) => c.kind === "modified").length,
    contentAdded: contentChanges.filter((c) => c.kind === "added").length,
    contentRemoved: contentChanges.filter((c) => c.kind === "removed").length,
    engineModified: engineChanges.filter((c) => c.kind === "modified").length,
    engineAdded: engineChanges.filter((c) => c.kind === "added").length,
    engineRemoved: engineChanges.filter((c) => c.kind === "removed").length,
    modelsChanged: modelChanges.map((m) => m.stage),
    gitChanged,
  };

  const groups: DiffGroup[] = [];
  if (contentChanges.length) {
    groups.push({
      id: "content",
      title: "Content",
      subtitle: "Prompts, questions, lexicon, catalogues",
      changes: contentChanges,
    });
  }
  if (engineChanges.length) {
    groups.push({
      id: "engine",
      title: "Engine",
      subtitle: "Code that builds prompts and runs the queue",
      changes: engineChanges,
    });
  }
  if (modelChanges.length) {
    groups.push({
      id: "models",
      title: "Models",
      changes: modelChanges,
    });
  }
  if (gitChanged) {
    groups.push({
      id: "git",
      title: "Git",
      changes: [
        {
          kind: "modified",
          from: baseline.git || null,
          to: current.git || null,
        },
      ],
    });
  }

  return {
    unchanged,
    hasBaseline: true,
    summary,
    changes,
    groups,
    changelogMarkdown: formatChangelogMarkdown({ baseline, current, summary, groups }),
  };
}

function formatChangelogMarkdown({
  baseline,
  current,
  groups,
}: {
  baseline: PipelineLock;
  current: PipelineLock;
  summary?: DiffSummary | Record<string, never>;
  groups: DiffGroup[];
}): string {
  const lines = ["## Pipeline delta", ""];
  if (baseline.capturedAt) {
    lines.push(`Baseline captured: ${new Date(baseline.capturedAt).toISOString()}`);
  }
  lines.push(`Current scan: ${new Date(current.capturedAt).toISOString()}`);
  lines.push("");

  for (const g of groups) {
    lines.push(`### ${g.title}`);
    if (g.subtitle) lines.push(g.subtitle);
    lines.push("");
    if (g.id === "models") {
      for (const c of g.changes) {
        lines.push(`- ${c.stage}: \`${c.from}\` → \`${c.to}\``);
      }
    } else if (g.id === "git") {
      const c = g.changes[0];
      if (c) {
        const from = c.from ? `${c.from.sha}${c.from.dirty ? " (dirty)" : ""}` : "(none)";
        const to = c.to ? `${c.to.sha}${c.to.dirty ? " (dirty)" : ""}` : "(none)";
        lines.push(`- ${from} → ${to}`);
      }
    } else {
      for (const c of g.changes) {
        lines.push(`- ${c.kind} \`${c.path}\` — ${c.stageLabel}`);
      }
    }
    lines.push("");
  }

  if (groups.length === 0) {
    lines.push("No changes detected.");
  }

  return lines.join("\n");
}

function manifestCounts(): { content: number; engine: number; total: number } {
  const paths = listManifestPaths();
  let content = 0;
  let engine = 0;
  for (const p of paths) {
    if (PATH_META[p]?.tier === "engine") engine++;
    else content++;
  }
  return { content, engine, total: paths.length };
}

function buildPipelineStatus({
  baselineLock,
  baselineRunId,
  baselineHeadline,
}: {
  baselineLock: PipelineLock | null;
  baselineRunId?: string | null;
  baselineHeadline?: string | null;
}) {
  const current = scanPipelineNow();
  const diff = diffLocks(baselineLock, current);

  return {
    baseline: {
      runId: baselineRunId || null,
      headline: baselineHeadline || null,
      capturedAt: baselineLock?.capturedAt || null,
      hasLock: !!baselineLock,
      aggregates: baselineLock?.aggregates || null,
    },
    current: {
      capturedAt: current.capturedAt,
      aggregates: current.aggregates,
      manifestCounts: manifestCounts(),
    },
    unchanged: diff.unchanged,
    hasBaseline: diff.hasBaseline,
    summary: diff.summary,
    groups: diff.groups,
    changelogMarkdown: diff.changelogMarkdown,
  };
}

export {
  LOCK_FILE,
  ROOT,
  listManifestPaths,
  capturePipelineLock,
  writePipelineLock,
  readPipelineLockFromDir,
  scanPipelineNow,
  diffLocks,
  buildPipelineStatus,
  manifestCounts,
  formatChangelogMarkdown,
};
