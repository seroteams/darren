const fs = require("node:fs");
const path = require("node:path");
const { LOGS_ROOT, monthFolderFor } = require("./session");
const { readPipelineLockFromDir } = require("./pipeline-lock");

const STATE_FILE = "session-state.json";
const SKIP_DIRS = new Set(["probes"]);

function readState(stateFile) {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return null;
  }
}

function inferStage(s) {
  if (s.briefing) return "BRIEFING";
  if (s.turn >= (s.totalBudget || 8)) return "EVAL";
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
function reviewStatusOf(review) {
  const marks = review && typeof review.marks === "object" && review.marks ? review.marks : {};
  const decided = REVIEW_DIM_KEYS.filter((k) => marks[k] === "pass" || marks[k] === "fail").length;
  if (decided === 0) return "none";
  if (decided >= REVIEW_DIM_KEYS.length) return "complete";
  return "partial";
}

// Library badge inputs derived from a run's review.json: completeness, the
// manual overall verdict (keep/fix/block), and how many dimensions failed.
function reviewSummaryOf(dir) {
  const review = readJsonAt(dir, "review.json");
  const marks = review && typeof review.marks === "object" && review.marks ? review.marks : {};
  const overall =
    review && ["keep", "fix", "block"].includes(review.overall) ? review.overall : null;
  return {
    reviewStatus: reviewStatusOf(review),
    overall,
    failedCount: REVIEW_DIM_KEYS.filter((k) => marks[k] === "fail").length,
    decided: REVIEW_DIM_KEYS.filter((k) => marks[k] === "pass" || marks[k] === "fail").length,
  };
}

function walkRuns() {
  if (!fs.existsSync(LOGS_ROOT)) return [];
  const out = [];
  for (const monthEntry of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!monthEntry.isDirectory()) continue;
    if (SKIP_DIRS.has(monthEntry.name)) continue;
    const monthDir = path.join(LOGS_ROOT, monthEntry.name);
    let entries;
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
      if (!state || !state.id) continue;
      out.push({ id: state.id, dir, state });
    }
  }
  return out;
}

function findRunDir(id) {
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

function readPipelineLock(id) {
  const dir = findRunDir(id);
  if (!dir) return null;
  return readPipelineLockFromDir(dir);
}

function listRecentRuns(limit = 3) {
  const runs = walkRuns();
  runs.sort((a, b) => (b.state.lastSeenAt || 0) - (a.state.lastSeenAt || 0));
  return runs.slice(0, limit).map(({ id, dir, state }) => {
    const lock = readPipelineLockFromDir(dir);
    const pipelineDigest = lock?.aggregates
      ? { content: lock.aggregates.content, engine: lock.aggregates.engine, all: lock.aggregates.all }
      : null;
    return {
      id,
      dir,
      ctx: {
        name: state.ctx?.name || "",
        role: state.ctx?.role || "",
        seniority: state.ctx?.seniority || "",
        meetingType: state.ctx?.meetingType || "",
      },
      lastSeenAt: state.lastSeenAt || 0,
      stage: inferStage(state),
      headline: buildHeadline(state.ctx || {}),
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
  runs.sort((a, b) => (b.state.lastSeenAt || 0) - (a.state.lastSeenAt || 0));
  return runs.map(({ id, dir, state }) => {
    const ctx = state.ctx || {};
    return {
      id,
      headline: buildHeadline(ctx),
      ctx: {
        name: ctx.name || "",
        role: ctx.role || "",
        seniority: ctx.seniority || "",
        meetingType: ctx.meetingType || "",
      },
      lastSeenAt: state.lastSeenAt || 0,
      ...reviewSummaryOf(dir),
    };
  });
}

function findLatestRunWithLock() {
  const runs = walkRuns();
  runs.sort((a, b) => (b.state.lastSeenAt || 0) - (a.state.lastSeenAt || 0));
  for (const { id, dir, state } of runs) {
    const lock = readPipelineLockFromDir(dir);
    if (lock) {
      return {
        id,
        headline: buildHeadline(state.ctx || {}),
        lock,
      };
    }
  }
  return null;
}

function findLatestRun() {
  const runs = walkRuns();
  runs.sort((a, b) => (b.state.lastSeenAt || 0) - (a.state.lastSeenAt || 0));
  if (runs.length === 0) return null;
  const { id, dir, state } = runs[0];
  return {
    id,
    headline: buildHeadline(state.ctx || {}),
    lock: readPipelineLockFromDir(dir),
  };
}

function buildHeadline(ctx) {
  return [ctx.name, ctx.role, ctx.seniority, ctx.meetingType]
    .filter((s) => s && String(s).trim())
    .join(" · ");
}

function truncate(s, n = 80) {
  const flat = String(s).replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n - 1) + "…" : flat;
}

function notesSummary(notes) {
  if (!notes || notes.length === 0) return "No changes captured.";
  const first = truncate(notes[0].text || "");
  if (notes.length === 1) return `1 note: "${first}"`;
  return `${notes.length} notes captured. First: "${first}"`;
}

function summarizeRun(id) {
  const dir = findRunDir(id);
  if (!dir) return null;
  const state = readState(path.join(dir, STATE_FILE));
  if (!state) return null;
  const ctx = state.ctx || {};
  const headline = buildHeadline(ctx);
  const who = ctx.name || "(no name)";
  const roleBits = [ctx.seniority, ctx.role].filter(Boolean).join(" ");
  const overview = `For ${who}${roleBits ? ` (${roleBits})` : ""}. ${notesSummary(state.notes)}`;
  return {
    id,
    headline,
    overview,
    notes: state.notes || [],
    stage: inferStage(state),
  };
}

function readJsonAt(dir, ...parts) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, ...parts), "utf8"));
  } catch {
    return null;
  }
}

// Rich read for the Compare view: questions asked, briefing, notes, structured
// verdict, fingerprint, and script coverage for a single run.
function compareRun(id) {
  const dir = findRunDir(id);
  if (!dir) return null;
  const state = readState(path.join(dir, STATE_FILE));
  if (!state) return null;
  const transcript = readJsonAt(dir, "transcript.json") || [];
  const focus = readJsonAt(dir, "01-focus-points", "response.json");
  const coverage = readJsonAt(dir, "script-coverage.json");
  const prepRaw = readJsonAt(dir, "01b-preparation", "response.json");
  const prep = prepRaw ? prepRaw.brief || prepRaw : null;
  const review = readJsonAt(dir, "review.json");
  return {
    id,
    headline: buildHeadline(state.ctx || {}),
    ctx: state.ctx || {},
    mode: state.mode || "manual",
    runLabel: state.runLabel ?? null,
    fingerprint: state.fingerprint ?? null,
    verdict: state.verdict ?? null,
    notes: state.notes || [],
    stage: inferStage(state),
    turns: transcript.map((t) => ({
      alias: t.question?.alias ?? null,
      name: t.question?.name ?? null,
      answer: t.answer ?? null,
      skipped: Boolean(t.skipped),
      note: t.note ?? null,
    })),
    focusPoints: focus?.focus_points || focus || null,
    prep,
    briefing: state.briefing || null,
    review: review || null,
    scriptCoverage: coverage,
  };
}

function deleteRun(id) {
  const dir = findRunDir(id);
  if (!dir) return { deleted: false, id, reason: "not_found" };
  fs.rmSync(dir, { recursive: true, force: true });
  return { deleted: true, id, dir };
}

module.exports = {
  listRecentRuns,
  listFinishedRuns,
  summarizeRun,
  compareRun,
  deleteRun,
  findRunDir,
  readPipelineLock,
  findLatestRunWithLock,
  findLatestRun,
  buildHeadline,
  reviewStatusOf,
  REVIEW_DIM_KEYS,
};
