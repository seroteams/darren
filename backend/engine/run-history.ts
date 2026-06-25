import fs from "node:fs";
import path from "node:path";
import { LOGS_ROOT, monthFolderFor } from "./session.ts";
import { readPipelineLockFromDir } from "./pipeline-lock.ts";

const STATE_FILE = "session-state.json";
const SKIP_DIRS = new Set(["probes"]);

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readState(stateFile: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return null;
  }
}

function inferStage(s: Record<string, unknown>): string {
  if (s.briefing) return "BRIEFING";
  const turn = asNumber(s.turn);
  const totalBudget = asNumber(s.totalBudget);
  if (turn >= (totalBudget || 8)) return "EVAL";
  if (s.bankReady) return "QUESTIONING";
  if (s.focusPointsResult && s.preparationResult) return "BANK";
  if (s.focusPointsResult) return "PREPARATION";
  return "FOCUS_POINTS";
}

// In-app run review (QA tooling) writes review.json into the run folder.
// reviewStatus is always derived from marks — never stored as a separate truth.
// REVIEW_DIM_KEYS is the single source of truth for the 8 verdict dimensions on
// the server; the review handler imports it. (The client UI keeps its own
// DIMENSIONS list with labels/hints — keep the keys in sync.)
const REVIEW_DIM_KEYS = ["role_aware", "meeting_aware", "grounded", "evidence", "no_overreach", "trust", "next_actions", "briefing_usable"];
function reviewStatusOf(review: unknown): string {
  const marks: Record<string, unknown> = isObjectRecord(review) && isObjectRecord(review.marks) ? review.marks : {};
  const decided = REVIEW_DIM_KEYS.filter((k) => marks[k] === "pass" || marks[k] === "fail").length;
  if (decided === 0) return "none";
  if (decided >= REVIEW_DIM_KEYS.length) return "complete";
  return "partial";
}

// Library badge inputs derived from a run's review.json: completeness, the
// manual overall verdict (keep/fix/block), and how many dimensions failed.
function reviewSummaryOf(dir: string): {
  reviewStatus: string;
  overall: string | null;
  failedCount: number;
  decided: number;
} {
  const review = readJsonAt(dir, "review.json");
  const marks: Record<string, unknown> = isObjectRecord(review) && isObjectRecord(review.marks) ? review.marks : {};
  const overall =
    isObjectRecord(review) && typeof review.overall === "string" && ["keep", "fix", "block"].includes(review.overall)
      ? review.overall
      : null;
  return {
    reviewStatus: reviewStatusOf(review),
    overall,
    failedCount: REVIEW_DIM_KEYS.filter((k) => marks[k] === "fail").length,
    decided: REVIEW_DIM_KEYS.filter((k) => marks[k] === "pass" || marks[k] === "fail").length,
  };
}

// Archive flag lives in its own tiny file alongside review.json — keeps the
// archived bit off review.json (whose only writer is the review handler) and
// off session-state (which review mode never mutates).
const ARCHIVE_FILE = "archive.json";

function isArchivedAt(dir: string): boolean {
  const a = readJsonAt(dir, ARCHIVE_FILE);
  return Boolean(isObjectRecord(a) && a.archived);
}

function setArchived(id: string, archived: unknown): { ok: boolean; id: string; reason?: string; archived?: boolean } {
  const dir = findRunDir(id);
  if (!dir) return { ok: false, id, reason: "not_found" };
  const flag = Boolean(archived);
  const data = { version: 1, runId: id, archived: flag, updatedAt: new Date().toISOString() };
  const target = path.join(dir, ARCHIVE_FILE);
  const tmp = path.join(dir, ARCHIVE_FILE + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, target);
  return { ok: true, id, archived: flag };
}

interface WalkedRun {
  id: string;
  dir: string;
  state: Record<string, unknown>;
}

function walkRuns(): WalkedRun[] {
  if (!fs.existsSync(LOGS_ROOT)) return [];
  const out: WalkedRun[] = [];
  for (const monthEntry of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!monthEntry.isDirectory()) continue;
    if (SKIP_DIRS.has(monthEntry.name)) continue;
    const monthDir = path.join(LOGS_ROOT, monthEntry.name);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(monthDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(monthDir, entry.name);
      const stateFile = path.join(dir, STATE_FILE);
      if (!fs.existsSync(stateFile)) continue;
      const state = readState(stateFile);
      if (!isObjectRecord(state) || !state.id) continue;
      const id = state.id;
      if (typeof id !== "string") continue;
      out.push({ id, dir, state });
    }
  }
  return out;
}

function findRunDir(id: unknown): string | null {
  // Defense-in-depth: a real run id never contains a path separator or "..", so
  // reject anything that could escape LOGS_ROOT before it reaches path.join.
  if (typeof id !== "string" || /[\\/]|\.\./.test(id)) return null;
  const monthName = monthFolderFor(id);
  if (monthName) {
    const guess = path.join(LOGS_ROOT, monthName, id);
    if (fs.existsSync(path.join(guess, STATE_FILE))) return guess;
  }
  const hit = walkRuns().find((r) => r.id === id);
  return hit ? hit.dir : null;
}

function readPipelineLock(id: string) {
  const dir = findRunDir(id);
  if (!dir) return null;
  return readPipelineLockFromDir(dir);
}

function listRecentRuns(limit = 3) {
  const runs = walkRuns();
  runs.sort((a, b) => asNumber(b.state.lastSeenAt) - asNumber(a.state.lastSeenAt));
  return runs.slice(0, limit).map(({ id, dir, state }) => {
    const lock = readPipelineLockFromDir(dir);
    const pipelineDigest = lock?.aggregates
      ? { content: lock.aggregates.content, engine: lock.aggregates.engine, all: lock.aggregates.all }
      : null;
    const ctx = asRecord(state.ctx);
    return {
      id,
      dir,
      ctx: {
        name: asString(ctx.name),
        role: asString(ctx.role),
        seniority: asString(ctx.seniority),
        meetingType: asString(ctx.meetingType),
      },
      lastSeenAt: asNumber(state.lastSeenAt),
      stage: inferStage(state),
      headline: buildHeadline(ctx),
      pipelineDigest,
      reviewStatus: reviewStatusOf(readJsonAt(dir, "review.json")),
    };
  });
}

// Library (QA tooling): every FINISHED run (has a briefing), newest first, no
// limit. Each row carries review badge inputs so the Library can show verdict +
// failed count without opening the run.
function listFinishedRuns() {
  const runs = walkRuns().filter(({ state }) => state && state.briefing);
  runs.sort((a, b) => asNumber(b.state.lastSeenAt) - asNumber(a.state.lastSeenAt));
  return runs.map(({ id, dir, state }) => {
    const ctx = asRecord(state.ctx);
    return {
      id,
      headline: buildHeadline(ctx),
      ctx: {
        name: asString(ctx.name),
        role: asString(ctx.role),
        seniority: asString(ctx.seniority),
        meetingType: asString(ctx.meetingType),
      },
      lastSeenAt: asNumber(state.lastSeenAt),
      archived: isArchivedAt(dir),
      ...reviewSummaryOf(dir),
    };
  });
}

function findLatestRunWithLock() {
  const runs = walkRuns();
  runs.sort((a, b) => asNumber(b.state.lastSeenAt) - asNumber(a.state.lastSeenAt));
  for (const { id, dir, state } of runs) {
    const lock = readPipelineLockFromDir(dir);
    if (lock) {
      return {
        id,
        headline: buildHeadline(asRecord(state.ctx)),
        lock,
      };
    }
  }
  return null;
}

function findLatestRun() {
  const runs = walkRuns();
  runs.sort((a, b) => asNumber(b.state.lastSeenAt) - asNumber(a.state.lastSeenAt));
  if (runs.length === 0) return null;
  const first = runs[0];
  if (!first) return null;
  const { id, dir, state } = first;
  return {
    id,
    headline: buildHeadline(asRecord(state.ctx)),
    lock: readPipelineLockFromDir(dir),
  };
}

function buildHeadline(ctx: Record<string, unknown>): string {
  return [ctx.name, ctx.role, ctx.seniority, ctx.meetingType]
    .filter((s) => s && String(s).trim())
    .join(" · ");
}

function truncate(s: unknown, n = 80): string {
  const flat = String(s).replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n - 1) + "…" : flat;
}

function notesSummary(notes: unknown): string {
  if (!Array.isArray(notes) || notes.length === 0) return "No changes captured.";
  const first = truncate(asRecord(notes[0]).text || "");
  if (notes.length === 1) return `1 note: "${first}"`;
  return `${notes.length} notes captured. First: "${first}"`;
}

function summarizeRun(id: string) {
  const dir = findRunDir(id);
  if (!dir) return null;
  const state = readState(path.join(dir, STATE_FILE));
  if (!isObjectRecord(state)) return null;
  const ctx = asRecord(state.ctx);
  const headline = buildHeadline(ctx);
  const who = asString(ctx.name) || "(no name)";
  const roleBits = [ctx.seniority, ctx.role].filter(Boolean).join(" ");
  const overview = `For ${who}${roleBits ? ` (${roleBits})` : ""}. ${notesSummary(state.notes)}`;
  return {
    id,
    headline,
    overview,
    notes: Array.isArray(state.notes) ? state.notes : [],
    stage: inferStage(state),
  };
}

function readJsonAt(dir: string, ...parts: string[]): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, ...parts), "utf8"));
  } catch {
    return null;
  }
}

// Rich read for the Compare view: questions asked, briefing, notes, structured
// verdict, fingerprint, and script coverage for a single run.
function compareRun(id: string) {
  const dir = findRunDir(id);
  if (!dir) return null;
  const state = readState(path.join(dir, STATE_FILE));
  if (!isObjectRecord(state)) return null;
  const transcriptRaw = readJsonAt(dir, "transcript.json");
  const transcript: unknown[] = Array.isArray(transcriptRaw) ? transcriptRaw : [];
  const focus = readJsonAt(dir, "01-focus-points", "response.json");
  const coverage = readJsonAt(dir, "script-coverage.json");
  const prepRaw = readJsonAt(dir, "01b-preparation", "response.json");
  const prep = isObjectRecord(prepRaw) ? prepRaw.brief || prepRaw : null;
  const review = readJsonAt(dir, "review.json");
  return {
    id,
    headline: buildHeadline(asRecord(state.ctx)),
    ctx: isObjectRecord(state.ctx) ? state.ctx : {},
    mode: state.mode || "manual",
    runLabel: state.runLabel ?? null,
    fingerprint: state.fingerprint ?? null,
    verdict: state.verdict ?? null,
    notes: Array.isArray(state.notes) ? state.notes : [],
    stage: inferStage(state),
    turns: transcript.map((t) => {
      const entry = asRecord(t);
      const question = asRecord(entry.question);
      return {
        alias: question.alias ?? null,
        name: question.name ?? null,
        answer: entry.answer ?? null,
        skipped: Boolean(entry.skipped),
        note: entry.note ?? null,
      };
    }),
    focusPoints: isObjectRecord(focus) ? focus.focus_points || focus : focus || null,
    prep,
    briefing: state.briefing || null,
    review: review || null,
    scriptCoverage: coverage,
  };
}

function deleteRun(id: string): { deleted: boolean; id: string; reason?: string; dir?: string } {
  const dir = findRunDir(id);
  if (!dir) return { deleted: false, id, reason: "not_found" };
  fs.rmSync(dir, { recursive: true, force: true });
  return { deleted: true, id, dir };
}

function readTextAt(dir: string, ...parts: string[]): string | null {
  try {
    return fs.readFileSync(path.join(dir, ...parts), "utf8");
  } catch {
    return null;
  }
}

// Parse JSON text but keep the raw string if it isn't valid JSON — the stage
// view must surface exactly what the model returned, never hide a parse failure.
function parseLoose(text: string | null): unknown {
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// One stage's I/O for the "what was fed to the AI" view: the inputs that were
// injected, the exact prompt sent (prompt.md), the raw reply (response.json),
// and the shipped result (final.json) where one was logged. Returns null when
// the stage hasn't run yet (folder absent / empty).
function readStageDir(dir: string, key: string) {
  const stageDir = path.join(dir, key);
  if (!fs.existsSync(stageDir)) return null;
  const inputs = readJsonAt(stageDir, "inputs.json");
  const prompt = readTextAt(stageDir, "prompt.md");
  const raw = parseLoose(readTextAt(stageDir, "response.json"));
  const finalText = readTextAt(stageDir, "final.json");
  if (inputs == null && prompt == null && raw == null) return null;
  const out: { inputs: unknown; prompt: string | null; raw: unknown; final?: unknown } = { inputs, prompt, raw };
  if (finalText != null) out.final = parseLoose(finalText);
  return out;
}

// The Live Q&A loop logs one set of files per turn: NN-turn.json (question,
// answer, scoring) plus NN-prompt.md / NN-response.json (what the planner was
// sent and returned). Older live runs predate the prompt files — fall back to
// the scoring snapshot so the turn still shows something.
function readTurns(dir: string) {
  const turnsDir = path.join(dir, "04-dynamic-answers");
  if (!fs.existsSync(turnsDir)) return [];
  let files: string[];
  try {
    files = fs.readdirSync(turnsDir);
  } catch {
    return [];
  }
  return files
    .filter((f) => /^\d+-turn\.json$/.test(f))
    .sort()
    .map((f) => {
      const t = asRecord(readJsonAt(turnsDir, f));
      const pad = f.slice(0, f.indexOf("-"));
      const prompt = readTextAt(turnsDir, `${pad}-prompt.md`);
      const raw =
        parseLoose(readTextAt(turnsDir, `${pad}-response.json`)) ?? {
          assessment: t.assessment ?? null,
          new_queue: t.new_queue ?? null,
          issues: t.issues ?? null,
        };
      const question = asRecord(t.question);
      return {
        turn: t.turn ?? Number(pad),
        question: question.name ?? (typeof t.question === "string" ? t.question : null),
        answer: t.answer ?? null,
        skipped: Boolean(t.skipped),
        prompt,
        raw,
      };
    });
}

// Ordered stage-by-stage I/O for a run, for the right-rail Sent/Reply tabs.
// Skips stages that haven't run yet so an in-progress run returns what exists.
// null = unknown run (no folder); [] = a real run with no stages logged yet.
function readRunStages(id: string) {
  const dir = findRunDir(id);
  if (!dir) return null;
  const out: Array<Record<string, unknown>> = [];
  const push = (key: string, label: string): void => {
    const data = readStageDir(dir, key);
    if (data) out.push({ key, label, ...data });
  };
  push("01-focus-points", "Focus areas");
  push("01b-preparation", "Prep brief");
  push("03-question-bank", "Questions");
  const turns = readTurns(dir);
  if (turns.length) out.push({ key: "04-dynamic-answers", label: "Live Q&A", turns });
  push("05-evaluation", "Synthesis");
  return out;
}

export {
  walkRuns,
  listRecentRuns,
  listFinishedRuns,
  summarizeRun,
  compareRun,
  readRunStages,
  deleteRun,
  setArchived,
  isArchivedAt,
  findRunDir,
  readPipelineLock,
  findLatestRunWithLock,
  findLatestRun,
  buildHeadline,
  reviewStatusOf,
  reviewSummaryOf,
  REVIEW_DIM_KEYS,
};
