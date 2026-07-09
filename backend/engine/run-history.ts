import fs from "node:fs";
import path from "node:path";
import { LOGS_ROOT, monthFolderFor, createSession } from "./session.ts";
import { readPipelineLockFromDir } from "./pipeline-lock.ts";
import { isObjectRecord, asRecord, asString } from "../shared/guards.ts";

const STATE_FILE = "session-state.json";
const SKIP_DIRS = new Set(["probes"]);

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

// The data wall (Phase 007/2): a run belongs to a company when its stored orgId
// matches the caller's. Fencing is OPT-IN — with no caller orgId (CLI, gate, the
// session boot-restore) every run is visible, so those paths are untouched. A run
// with no orgId (pre-auth / anonymous) is invisible to any real company.
function runOwnedByOrg(state: unknown, orgId?: string | null): boolean {
  if (!orgId) return true; // unfenced caller — see CLI/gate
  return isObjectRecord(state) && state.orgId === orgId;
}

// The member data wall (member-nav Phase 2): a run belongs to a member when its stored
// userId matches the caller's. Unlike runOwnedByOrg this is NEVER unfenced — a caller
// with no userId, or a run with no userId, matches nothing. So a member only ever sees
// runs they created; every other member's (and every admin's) run is invisible.
function runOwnedByUser(state: unknown, userId?: string | null): boolean {
  if (!userId) return false;
  return isObjectRecord(state) && state.userId === userId;
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

// Library badge inputs derived from a run's review: completeness, the manual
// overall verdict (keep/fix/block), and how many dimensions failed. The value-
// based half is separate so the Postgres store (review lives in a column, not
// a file) computes the identical shape (postgres-runtime-data Phase 3).
function reviewSummaryFromValue(review: unknown): {
  reviewStatus: string;
  overall: string | null;
  failedCount: number;
  decided: number;
} {
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

function reviewSummaryOf(dir: string): ReturnType<typeof reviewSummaryFromValue> {
  return reviewSummaryFromValue(readJsonAt(dir, "review.json"));
}

// Which persona (if any) a run was driven by, and whether it was scripted.
// Read off saved state: the scripted lane stamps fingerprint.personaId at start
// and mode is persisted on every save. Manual runs come back {null, "manual"}.
function personaTagOf(state: unknown): { personaId: string | null; mode: string } {
  const s = asRecord(state);
  const fp = asRecord(s.fingerprint);
  return {
    personaId: asString(fp.personaId) || null,
    mode: asString(s.mode) || "manual",
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

// The manager's own 1:1 rating for a run (pre-go-live PG3), or null. Value-based
// half shared with the Postgres store (rating column); the file half reads the
// rating.json sidecar the runs service writes. Only a valid 1-5 star shape surfaces.
function ratingFromValue(r: unknown): { stars: number; note: string; updatedAt: string | null } | null {
  if (!isObjectRecord(r)) return null;
  const stars = asNumber(r.stars);
  if (stars < 1 || stars > 5) return null;
  return { stars, note: asString(r.note), updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null };
}

function ratingOf(dir: string): { stars: number; note: string; updatedAt: string | null } | null {
  return ratingFromValue(readJsonAt(dir, "rating.json"));
}

function setArchived(id: string, archived: unknown, orgId?: string | null): { ok: boolean; id: string; reason?: string; archived?: boolean } {
  const dir = findRunDir(id, orgId);
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

// When orgId is given, only that company's runs are walked (the data wall);
// omit it and every run is returned (CLI/gate/restore).
function walkRuns(orgId?: string | null): WalkedRun[] {
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
      if (!runOwnedByOrg(state, orgId)) continue; // fence: skip other companies' runs
      const id = state.id;
      if (typeof id !== "string") continue;
      out.push({ id, dir, state });
    }
  }
  return out;
}

// When orgId is given, a run that exists but belongs to another company resolves
// to null (not-found) — the same answer a stranger gets, so ids can't be probed.
function findRunDir(id: unknown, orgId?: string | null): string | null {
  // Defense-in-depth: a real run id never contains a path separator or "..", so
  // reject anything that could escape LOGS_ROOT before it reaches path.join.
  if (typeof id !== "string" || /[\\/]|\.\./.test(id)) return null;
  const monthName = monthFolderFor(id);
  if (monthName) {
    const guess = path.join(LOGS_ROOT, monthName, id);
    const stateFile = path.join(guess, STATE_FILE);
    if (fs.existsSync(stateFile)) {
      return runOwnedByOrg(readState(stateFile), orgId) ? guess : null;
    }
  }
  const hit = walkRuns(orgId).find((r) => r.id === id);
  return hit ? hit.dir : null;
}

function readPipelineLock(id: string) {
  const dir = findRunDir(id);
  if (!dir) return null;
  return readPipelineLockFromDir(dir);
}

function listRecentRuns(limit = 3, orgId?: string | null) {
  const runs = walkRuns(orgId);
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
function listFinishedRuns(orgId?: string | null) {
  const runs = walkRuns(orgId).filter(({ state }) => state && state.briefing);
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
      ...personaTagOf(state),
      ...reviewSummaryOf(dir),
    };
  });
}

// Which of a member's own runs their list shows: finished runs always; a started-but-
// unfinished prep only when includeOpen is set AND it already names a person (the Team
// groups on the name, so a nameless prep has nothing to show). Owned-by-someone-else is
// never visible, open or finished.
function memberRunVisible(state: unknown, userId: string | null | undefined, includeOpen: boolean): boolean {
  if (!runOwnedByUser(state, userId)) return false;
  const s = asRecord(state);
  if (s.briefing) return true;
  return includeOpen && asString(asRecord(s.ctx).name).trim() !== "";
}

// A member's OWN finished runs (member-nav Phase 2), newest first. Double-fenced:
// walkRuns applies the company wall, memberRunVisible keeps only this member's runs.
// includeOpen (Team-for-managers) adds their started-but-unfinished preps; every row
// carries `finished` so the Team can show those honestly ("prep in progress").
// Returns a lightweight member-safe shape (no QA review / archive fields).
function listFinishedRunsForMember(orgId: string | null | undefined, userId: string | null | undefined, includeOpen = false) {
  const runs = walkRuns(orgId).filter(({ state }) => state && memberRunVisible(state, userId, includeOpen));
  runs.sort((a, b) => asNumber(b.state.lastSeenAt) - asNumber(a.state.lastSeenAt));
  return runs.map(({ id, dir, state }) => {
    const ctx = asRecord(state.ctx);
    return {
      id,
      personId: asString(state.personId) || null, // people-roster Phase 4: join runs to the roster
      headline: buildHeadline(ctx),
      ctx: {
        name: asString(ctx.name),
        role: asString(ctx.role),
        seniority: asString(ctx.seniority),
        meetingType: asString(ctx.meetingType),
      },
      lastSeenAt: asNumber(state.lastSeenAt),
      finished: Boolean(state.briefing),
      rating: ratingOf(dir),
    };
  });
}

// "1:1s about me" (people-roster Phase 5): the finished runs whose personId is one of the
// given roster people, org-fenced. Deliberately MINIMAL rows — meeting type + when + who ran
// it — because manager notes/briefings/ratings are sensitive (no-inference ruling): the member
// sees that a 1:1 happened, never its content. userId is the run's creator (the manager);
// the service maps it to a display name.
function listFinishedRunsAboutPerson(orgId: string | null | undefined, personIds: string[]) {
  if (!orgId || personIds.length === 0) return [];
  const wanted = new Set(personIds);
  return walkRuns(orgId)
    .filter(({ state }) => state && state.briefing && wanted.has(asString(state.personId)))
    .sort((a, b) => asNumber(b.state.lastSeenAt) - asNumber(a.state.lastSeenAt))
    .map(({ id, state }) => ({
      id,
      meetingType: asString(asRecord(state.ctx).meetingType),
      lastSeenAt: asNumber(state.lastSeenAt),
      completedAt: asNumber(state.completedAt) || null,
      userId: asString(state.userId) || null,
    }));
}

// Every finished run across ALL companies, attributed to its owner (pre-go-live PG7).
// Unfenced on purpose — the ONE cross-tenant read, reachable only behind the superadmin
// repo/route. Returns just the fields the alpha signal needs (owner, when, rating); the
// service does all counting/bucketing so it stays unit-testable. A run with no userId
// (machine/gate sessions) has userId null and is ignored by the owner grouping.
function listRunsForSuperadmin(): { userId: string | null; lastSeenAt: number; stars: number | null }[] {
  return walkRuns()
    .filter(({ state }) => state && state.briefing)
    .map(({ dir, state }) => ({
      userId: typeof state.userId === "string" ? state.userId : null,
      lastSeenAt: asNumber(state.lastSeenAt),
      stars: ratingOf(dir)?.stars ?? null,
    }));
}

// The unclaimed guest pile (guest-run Phase 4): OWNERLESS finished runs — no userId AND
// no orgId. A claimed run gains a userId and leaves the list. Unfenced on purpose —
// cross-tenant, reachable only behind the superadmin repo/route. DB-less twin of
// pgListGuestRuns (db/runs-store).
function listOwnerlessFinishedRuns() {
  const runs = walkRuns().filter(
    ({ state }) => state && state.briefing && state.userId == null && state.orgId == null,
  );
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
      rating: ratingOf(dir),
    };
  });
}

// One user's finished runs, newest-first, attributed by userId across ALL companies
// (pre-go-live PG8 drilldown). Unfenced on org — reachable only behind the superadmin
// repo/route. Same member-safe row shape as listFinishedRunsForMember (headline, ctx,
// rating), so the drilldown reuses PG1 rows + PG3 ratings. An absent userId → [] (the
// runOwnedByUser guard never matches a null id).
function listFinishedRunsForUser(userId: string | null | undefined) {
  const runs = walkRuns().filter(({ state }) => state && state.briefing && runOwnedByUser(state, userId));
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
      rating: ratingOf(dir),
    };
  });
}

// A read-only view of ONE of the member's own runs (member-nav Phase 2): the briefing
// plus its context. Fenced by company AND user — a run the caller doesn't own resolves
// to null (the same "unknown" answer a stranger gets, so ids can't be probed).
function memberRunView(id: string, orgId: string | null | undefined, userId: string | null | undefined) {
  const dir = findRunDir(id, orgId);
  if (!dir) return null;
  const state = readState(path.join(dir, STATE_FILE));
  if (!runOwnedByUser(state, userId)) return null;
  const s = asRecord(state);
  const ctx = asRecord(s.ctx);
  return {
    id,
    headline: buildHeadline(ctx),
    ctx: {
      name: asString(ctx.name),
      role: asString(ctx.role),
      seniority: asString(ctx.seniority),
      meetingType: asString(ctx.meetingType),
    },
    briefing: s.briefing ?? null,
    lastSeenAt: asNumber(s.lastSeenAt),
    completedAt: s.completedAt ?? null,
    rating: ratingOf(dir),
  };
}

// A read-only view of ANY ONE finished run, UNFENCED (pre-go-live PG8 superadmin drilldown).
// Same shape as memberRunView, but no org/user check — reachable only behind
// requireSuperadminRoute. Returns null for an unknown id or a run with no briefing (not
// finished), so ids can't be probed and half-run sessions never surface.
function superadminRunView(id: string) {
  const dir = findRunDir(id);
  if (!dir) return null;
  const state = readState(path.join(dir, STATE_FILE));
  const s = asRecord(state);
  if (!s.briefing) return null;
  const ctx = asRecord(s.ctx);
  return {
    id,
    headline: buildHeadline(ctx),
    ctx: {
      name: asString(ctx.name),
      role: asString(ctx.role),
      seniority: asString(ctx.seniority),
      meetingType: asString(ctx.meetingType),
    },
    briefing: s.briefing ?? null,
    lastSeenAt: asNumber(s.lastSeenAt),
    completedAt: typeof s.completedAt === "number" ? s.completedAt : null,
    rating: ratingOf(dir),
  };
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

function summarizeRun(id: string, orgId?: string | null) {
  const dir = findRunDir(id, orgId);
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
function compareRun(id: string, orgId?: string | null) {
  const dir = findRunDir(id, orgId);
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

function deleteRun(id: string, orgId?: string | null): { deleted: boolean; id: string; reason?: string; dir?: string } {
  const dir = findRunDir(id, orgId);
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
function readRunStages(id: string, orgId?: string | null) {
  const dir = findRunDir(id, orgId);
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

// --- Dev-only "prefill a run" (clone a finished run) ---------------------------
// A free way to get a full run to walk without paying for generation: copy an
// already-finished run into a new one the caller owns. cloneRunState is the pure
// half (stamp a fresh identity + the caller's owner onto a copy of the state);
// cloneRun does the I/O around it. Gated to admins at the route.

interface CloneStamp {
  id: string;
  dir: string;
  orgId: string | null;
  userId: string | null;
  now: number;
}

// Return a copy of a finished run's state with a new identity + the caller as owner,
// so it lands in the caller's own /mine. The briefing (and everything else) is kept
// verbatim — same answers, same result, every time. Never mutates the source.
function cloneRunState(source: unknown, stamp: CloneStamp): Record<string, unknown> {
  const base = isObjectRecord(source) ? source : {};
  return {
    ...base,
    id: stamp.id,
    dir: stamp.dir,
    orgId: stamp.orgId,
    userId: stamp.userId,
    createdAt: stamp.now,
    lastSeenAt: stamp.now,
    completedAt: stamp.now,
    runLabel: "prefill",
  };
}

// Copy a FINISHED run (has a briefing) into a fresh run owned by the caller. Source
// lookup is unfenced (any company's run on disk) — SAFE ONLY because the route is gated
// dev-only (prefillAllowed in runs.controller); it must never be exposed in production,
// where that would cross the company wall (F-002). Returns { id } of the new run, or null
// when the source is unknown or not finished. All file copies: zero API cost.
function cloneRun(sourceId: unknown, orgId: string | null, userId: string | null): { id: string } | null {
  const srcDir = findRunDir(sourceId); // unfenced (admin-guarded route)
  if (!srcDir) return null;
  const source = readState(path.join(srcDir, STATE_FILE));
  if (!isObjectRecord(source) || !source.briefing) return null; // only clone finished runs
  const { id, dir } = createSession(); // mints a new id + dir under this month
  fs.cpSync(srcDir, dir, { recursive: true }); // briefing lives in state; stages come too
  const cloned = cloneRunState(source, { id, dir, orgId, userId, now: Date.now() });
  fs.writeFileSync(path.join(dir, STATE_FILE), JSON.stringify(cloned, null, 2));
  return { id };
}

export {
  runOwnedByOrg,
  runOwnedByUser,
  memberRunVisible,
  cloneRunState,
  cloneRun,
  listFinishedRunsForMember,
  listFinishedRunsAboutPerson,
  listRunsForSuperadmin,
  listFinishedRunsForUser,
  listOwnerlessFinishedRuns,
  memberRunView,
  superadminRunView,
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
  reviewSummaryFromValue,
  ratingFromValue,
  personaTagOf,
  inferStage,
  notesSummary,
  REVIEW_DIM_KEYS,
};
