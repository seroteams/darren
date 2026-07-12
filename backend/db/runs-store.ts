// The Postgres read layer for finished-run history (postgres-runtime-data Phase 3)
// — every run-history.ts read, reproduced against the `sessions` + `run_artifacts`
// tables. This is the security-sensitive cutover, so the fences are DOUBLE-checked:
//
//   1. SQL narrows on the indexed denormalized columns (org_id / user_id /
//      finished / person_id) — fast listings, no jsonb scans.
//   2. Every returned row is re-checked in JS with the engine's OWN wall
//      functions (runOwnedByOrg / runOwnedByUser / memberRunVisible) against the
//      authoritative `state` jsonb — the exact same predicates the file store
//      applies. A drifted denormalized column can therefore never LEAK a run;
//      it can only hide one.
//
// Row shapes come from the same exported run-history helpers the file store uses
// (buildHeadline, reviewSummaryFromValue, ratingFromValue, personaTagOf,
// inferStage, notesSummary), so file and DB rows can't drift apart — and the
// pg-parity test deep-equals both stores anyway.
//
// Sidecars live in columns (sessions.review / rating / archived_at); when the
// file echo is on, sidecar WRITES also land on disk so flipping back to the file
// store (the workstream's standing rollback) loses nothing.

import fs from "node:fs";
import path from "node:path";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getDb } from "./client.ts";
import { sessions as sessionsTable, runArtifacts } from "./schema.ts";
import { shouldEchoToDisk } from "./run-artifacts-store.ts";
import { DEFAULT_ORG_ID, ensureDefaultOrg } from "./sessions-store.ts";
import {
  runOwnedByOrg,
  runOwnedByUser,
  memberRunVisible,
  buildHeadline,
  reviewStatusOf,
  reviewSummaryFromValue,
  ratingFromValue,
  costFromState,
  personaTagOf,
  inferStage,
  notesSummary,
  overviewFields,
  cloneRunState,
} from "../engine/run-history.ts";
import { historyRunMatches, historySessionFromState } from "../engine/focus-history.ts";
import type { FocusHistorySession } from "../engine/focus-history.ts";
import { createSession, monthFolderFor, LOGS_ROOT } from "../engine/session.ts";
import { isObjectRecord, asRecord, asString } from "../shared/guards.ts";

const TURNS_STAGE = "04-dynamic-answers";

/** One session row as the reads use it. `state` is the authoritative copy. */
export interface DbRun {
  id: string;
  dir: string;
  state: Record<string, unknown>;
  review: unknown;
  rating: unknown;
  archived: boolean;
  lastSeenAt: number;
}

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

// The org_id/user_id columns are uuid-typed, but a caller id isn't guaranteed to
// be one (the dev side-door hands out "dev-org"/"dev-user"). A non-uuid value
// would make the SQL comparison THROW — the file store just matched nothing. So
// the SQL narrowing only applies to uuid-shaped ids; otherwise we skip the SQL
// filter and let the JS wall (which compares the state values exactly like the
// file store) produce the same empty answer.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sqlSafeId(v: string | null | undefined): string | null {
  return v && UUID_RE.test(v) ? v : null;
}

const rowColumns = {
  sessionKey: sessionsTable.sessionKey,
  state: sessionsTable.state,
  logDir: sessionsTable.logDir,
  review: sessionsTable.review,
  rating: sessionsTable.rating,
  archivedAt: sessionsTable.archivedAt,
  lastSeenAt: sessionsTable.lastSeenAt,
};

type RawRow = {
  sessionKey: string;
  state: unknown;
  logDir: string | null;
  review: unknown;
  rating: unknown;
  archivedAt: Date | null;
  lastSeenAt: number;
};

// A run's dir is its logical key even when no folder exists (echo off) — keep
// the same logs/<month>/<id> shape the file store reports.
function dirOf(row: RawRow): string {
  if (row.logDir) return row.logDir;
  const month = monthFolderFor(row.sessionKey);
  return month ? path.join(LOGS_ROOT, month, row.sessionKey) : path.join(LOGS_ROOT, row.sessionKey);
}

function toDbRun(row: RawRow): DbRun | null {
  const state = row.state;
  if (!isObjectRecord(state) || typeof state.id !== "string") return null;
  return {
    id: row.sessionKey,
    dir: dirOf(row),
    state,
    review: row.review ?? null,
    rating: row.rating ?? null,
    archived: Boolean(row.archivedAt),
    lastSeenAt: row.lastSeenAt,
  };
}

// ---------------------------------------------------------------------------
// Pure row filters + mappers — exported so the per-variant fencing tests run
// against them WITHOUT a database (the SQL layer only pre-narrows; these are
// the wall). Every predicate delegates to the engine's own fence functions.
// ---------------------------------------------------------------------------

export function fenceOrgRows(rows: DbRun[], orgId?: string | null): DbRun[] {
  return rows.filter((r) => runOwnedByOrg(r.state, orgId));
}

export function fenceMemberRows(
  rows: DbRun[],
  orgId: string | null | undefined,
  userId: string | null | undefined,
  includeOpen: boolean,
): DbRun[] {
  return rows.filter((r) => runOwnedByOrg(r.state, orgId) && memberRunVisible(r.state, userId, includeOpen));
}

export function fenceUserRows(rows: DbRun[], userId: string | null | undefined): DbRun[] {
  return rows.filter((r) => Boolean(asRecord(r.state).briefing) && runOwnedByUser(r.state, userId));
}

export function fenceAboutPersonRows(
  rows: DbRun[],
  orgId: string | null | undefined,
  personIds: string[],
): DbRun[] {
  if (!orgId || personIds.length === 0) return [];
  const wanted = new Set(personIds);
  return rows.filter(
    (r) =>
      runOwnedByOrg(r.state, orgId) &&
      Boolean(asRecord(r.state).briefing) &&
      wanted.has(asString(asRecord(r.state).personId)),
  );
}

function ctxOf(state: Record<string, unknown>): { name: string; role: string; seniority: string; meetingType: string } {
  const ctx = asRecord(state.ctx);
  return {
    name: asString(ctx.name),
    role: asString(ctx.role),
    seniority: asString(ctx.seniority),
    meetingType: asString(ctx.meetingType),
  };
}

export function toFinishedRow(r: DbRun): Record<string, unknown> {
  return {
    id: r.id,
    headline: buildHeadline(asRecord(r.state.ctx)),
    ctx: ctxOf(r.state),
    lastSeenAt: asNumber(r.state.lastSeenAt),
    archived: r.archived,
    // Bare stars number only — the manager's private note never rides this admin feed.
    rating: ratingFromValue(r.rating)?.stars ?? null,
    cost: costFromState(r.state),
    ...personaTagOf(r.state),
    ...reviewSummaryFromValue(r.review),
  };
}

export function toMemberRow(r: DbRun): Record<string, unknown> {
  return {
    id: r.id,
    personId: asString(r.state.personId) || null,
    headline: buildHeadline(asRecord(r.state.ctx)),
    ctx: ctxOf(r.state),
    lastSeenAt: asNumber(r.state.lastSeenAt),
    finished: Boolean(r.state.briefing),
    rating: ratingFromValue(r.rating),
  };
}

export function toAboutPersonRow(r: DbRun): Record<string, unknown> {
  return {
    id: r.id,
    meetingType: asString(asRecord(r.state.ctx).meetingType),
    lastSeenAt: asNumber(r.state.lastSeenAt),
    completedAt: asNumber(r.state.completedAt) || null,
    userId: asString(r.state.userId) || null,
  };
}

export function toUserRunRow(r: DbRun): {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
} {
  return {
    id: r.id,
    headline: buildHeadline(asRecord(r.state.ctx)),
    ctx: ctxOf(r.state),
    lastSeenAt: asNumber(r.state.lastSeenAt),
    rating: ratingFromValue(r.rating),
  };
}

export function toMemberView(r: DbRun): Record<string, unknown> {
  const transcript: unknown[] = Array.isArray(r.state.transcript) ? r.state.transcript : [];
  return {
    id: r.id,
    headline: buildHeadline(asRecord(r.state.ctx)),
    ctx: ctxOf(r.state),
    briefing: r.state.briefing ?? null,
    // The raw Q&A behind the briefing (member Answers tab). Mirrors pgCompareRun's
    // projection but WITHOUT the internal `note` — planner notes carry [SHALLOW]/[SKIP]
    // markers that must never reach a manager.
    turns: transcript.map((t) => {
      const entry = asRecord(t);
      const question = asRecord(entry.question);
      return {
        alias: question.alias ?? null,
        name: question.name ?? null,
        answer: entry.answer ?? null,
        skipped: Boolean(entry.skipped),
      };
    }),
    lastSeenAt: asNumber(r.state.lastSeenAt),
    completedAt: r.state.completedAt ?? null,
    rating: ratingFromValue(r.rating),
  };
}

// ---------------------------------------------------------------------------
// SQL reads
// ---------------------------------------------------------------------------

async function rowsWhere(conditions: Array<ReturnType<typeof eq> | undefined>, limit?: number): Promise<DbRun[]> {
  const defined = conditions.filter((c): c is NonNullable<typeof c> => Boolean(c));
  let q = getDb()
    .select(rowColumns)
    .from(sessionsTable)
    .where(defined.length ? and(...defined) : undefined)
    .orderBy(desc(sessionsTable.lastSeenAt))
    .$dynamic();
  if (limit) q = q.limit(limit);
  const raw = (await q) as RawRow[];
  return raw.map(toDbRun).filter((r): r is DbRun => r !== null);
}

async function rowByKey(id: unknown): Promise<DbRun | null> {
  if (typeof id !== "string" || !id) return null;
  const raw = (await getDb()
    .select(rowColumns)
    .from(sessionsTable)
    .where(eq(sessionsTable.sessionKey, id))
    .limit(1)) as RawRow[];
  const first = raw[0];
  return first ? toDbRun(first) : null;
}

// When orgId is given, a run that exists but belongs to another company resolves
// to null — the same "unknown" answer a stranger gets (mirrors findRunDir).
async function ownedRow(id: unknown, orgId?: string | null): Promise<DbRun | null> {
  const row = await rowByKey(id);
  if (!row) return null;
  return runOwnedByOrg(row.state, orgId) ? row : null;
}

// --- artifacts -------------------------------------------------------------

interface ArtifactRow {
  stage: string;
  name: string;
  kind: string;
  content: unknown;
  contentText: string | null;
}

async function artifactsFor(sessionKey: string): Promise<ArtifactRow[]> {
  return (await getDb()
    .select({
      stage: runArtifacts.stage,
      name: runArtifacts.name,
      kind: runArtifacts.kind,
      content: runArtifacts.content,
      contentText: runArtifacts.contentText,
    })
    .from(runArtifacts)
    .where(eq(runArtifacts.sessionKey, sessionKey))) as ArtifactRow[];
}

// Batch the pipeline-lock.json read for a set of runs into ONE query instead of
// one artifactsFor() per run (the recent-runs list asks for up to 12). Returns a
// key→artifact map; missing runs simply aren't in it.
async function pipelineLocksFor(sessionKeys: string[]): Promise<Map<string, ArtifactRow>> {
  const out = new Map<string, ArtifactRow>();
  if (sessionKeys.length === 0) return out;
  const rows = (await getDb()
    .select({
      sessionKey: runArtifacts.sessionKey,
      stage: runArtifacts.stage,
      name: runArtifacts.name,
      kind: runArtifacts.kind,
      content: runArtifacts.content,
      contentText: runArtifacts.contentText,
    })
    .from(runArtifacts)
    .where(
      and(
        inArray(runArtifacts.sessionKey, sessionKeys),
        eq(runArtifacts.stage, ""),
        eq(runArtifacts.name, "pipeline-lock.json"),
      ),
    )) as (ArtifactRow & { sessionKey: string })[];
  for (const r of rows) {
    if (!out.has(r.sessionKey)) out.set(r.sessionKey, r);
  }
  return out;
}

function artifactValue(a: ArtifactRow | undefined): unknown {
  if (!a) return null;
  return a.kind === "json" ? (a.content ?? null) : parseLoose(a.contentText);
}

function artifactText(a: ArtifactRow | undefined): string | null {
  if (!a) return null;
  if (a.kind === "json") return a.content == null ? null : JSON.stringify(a.content, null, 2);
  return a.contentText;
}

// Parse JSON text but keep the raw string if it isn't valid JSON — mirror of
// run-history.parseLoose: the stage view must surface exactly what the model
// returned, never hide a parse failure.
function parseLoose(text: string | null): unknown {
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function pick(arts: ArtifactRow[], stage: string, name: string): ArtifactRow | undefined {
  return arts.find((a) => a.stage === stage && a.name === name);
}

// ---------------------------------------------------------------------------
// The reads (1:1 with run-history.ts)
// ---------------------------------------------------------------------------

export async function pgListRecentRuns(limit = 3, orgId?: string | null): Promise<unknown[]> {
  const rows = fenceOrgRows(await rowsWhere([sqlSafeId(orgId) ? eq(sessionsTable.orgId, sqlSafeId(orgId)!) : undefined], limit ? limit * 3 : undefined), orgId).slice(0, limit);
  const locks = await pipelineLocksFor(rows.map((r) => r.id));
  const out: unknown[] = [];
  for (const r of rows) {
    const lock = asRecord(artifactValue(locks.get(r.id)));
    const aggregates = isObjectRecord(lock.aggregates) ? lock.aggregates : null;
    const ctx = asRecord(r.state.ctx);
    out.push({
      id: r.id,
      dir: r.dir,
      ctx: ctxOf(r.state),
      lastSeenAt: asNumber(r.state.lastSeenAt),
      stage: inferStage(r.state),
      headline: buildHeadline(ctx),
      pipelineDigest: aggregates
        ? { content: aggregates.content, engine: aggregates.engine, all: aggregates.all }
        : null,
      reviewStatus: reviewStatusOf(r.review),
    });
  }
  return out;
}

export async function pgListFinishedRuns(orgId?: string | null): Promise<unknown[]> {
  const rows = fenceOrgRows(
    await rowsWhere([eq(sessionsTable.finished, true), sqlSafeId(orgId) ? eq(sessionsTable.orgId, sqlSafeId(orgId)!) : undefined]),
    orgId,
  ).filter((r) => Boolean(r.state.briefing));
  return rows.map(toFinishedRow);
}

export async function pgListFinishedRunsForMember(
  orgId: string | null | undefined,
  userId: string | null | undefined,
  includeOpen = false,
): Promise<unknown[]> {
  if (!userId) return []; // the member fence is NEVER unfenced
  const rows = await rowsWhere([
    sqlSafeId(userId) ? eq(sessionsTable.userId, sqlSafeId(userId)!) : undefined,
    sqlSafeId(orgId) ? eq(sessionsTable.orgId, sqlSafeId(orgId)!) : undefined,
  ]);
  return fenceMemberRows(rows, orgId, userId, includeOpen).map(toMemberRow);
}

export async function pgListFinishedRunsAboutPerson(
  orgId: string | null | undefined,
  personIds: string[],
): Promise<unknown[]> {
  if (!orgId || personIds.length === 0) return [];
  const rows = await rowsWhere([
    sqlSafeId(orgId) ? eq(sessionsTable.orgId, sqlSafeId(orgId)!) : undefined,
    eq(sessionsTable.finished, true),
    inArray(sessionsTable.personId, personIds.filter((p) => sqlSafeId(p) !== null)),
  ]);
  return fenceAboutPersonRows(rows, orgId, personIds).map(toAboutPersonRow);
}

// Past focus points for the SAME manager + person (focus-freshness Phase 1).
// SQL pre-narrows on the denormalized columns; the JS wall is the engine's own
// historyRunMatches — a drifted column can hide a run, never leak one.
export async function pgFocusHistory({
  orgId,
  userId,
  personId,
  limit = 3,
  excludeId,
}: {
  orgId?: string | null;
  userId?: string | null;
  personId?: string | null;
  limit?: number;
  excludeId?: string | null;
}): Promise<FocusHistorySession[]> {
  if (!userId || !personId) return [];
  // No `finished` narrow on purpose: unfinished preps count as history
  // (Carl's call 2026-07-11 — the agenda was suggested either way), and the
  // denormalized flag proved stale on real rows. The JS wall still fences.
  const rows = fenceOrgRows(
    await rowsWhere([
      sqlSafeId(orgId) ? eq(sessionsTable.orgId, sqlSafeId(orgId)!) : undefined,
      sqlSafeId(userId) ? eq(sessionsTable.userId, sqlSafeId(userId)!) : undefined,
      sqlSafeId(personId) ? eq(sessionsTable.personId, sqlSafeId(personId)!) : undefined,
    ]),
    orgId,
  );
  return rows
    .filter((r) => r.id !== excludeId && historyRunMatches(r.state, { userId, personId }))
    .map((r) => historySessionFromState(r.state))
    .filter((s): s is FocusHistorySession => s !== null)
    .slice(0, limit);
}

export async function pgListRunsForSuperadmin(): Promise<{ userId: string | null; createdAt: number; lastSeenAt: number; stars: number | null }[]> {
  const rows = (await rowsWhere([eq(sessionsTable.finished, true)])).filter((r) => Boolean(r.state.briefing));
  return rows.map((r) => ({
    userId: typeof r.state.userId === "string" ? r.state.userId : null,
    // When the run started — the return signal's clock (validation-kit Phase 2).
    // Old rows without it fall back to lastSeenAt rather than reporting 1970.
    createdAt: asNumber(r.state.createdAt) || asNumber(r.state.lastSeenAt),
    lastSeenAt: asNumber(r.state.lastSeenAt),
    stars: ratingFromValue(r.rating)?.stars ?? null,
  }));
}

// The unclaimed guest pile (guest-run Phase 4): OWNERLESS finished runs — no userId
// AND no orgId in the session state. A claimed run gains a userId and leaves the list.
// Cross-tenant by design, reachable only behind the superadmin route.
export async function pgListGuestRuns(): Promise<ReturnType<typeof toUserRunRow>[]> {
  const rows = (await rowsWhere([eq(sessionsTable.finished, true)])).filter(
    (r) => Boolean(r.state.briefing) && r.state.userId == null && r.state.orgId == null,
  );
  return rows.map(toUserRunRow);
}

export async function pgListFinishedRunsForUser(userId: string | null | undefined): Promise<
  ReturnType<typeof toUserRunRow>[]
> {
  if (!userId) return [];
  const rows = fenceUserRows(await rowsWhere([sqlSafeId(userId) ? eq(sessionsTable.userId, sqlSafeId(userId)!) : undefined, eq(sessionsTable.finished, true)]), userId);
  return rows.map(toUserRunRow);
}

export async function pgMemberRunView(
  id: string,
  orgId: string | null | undefined,
  userId: string | null | undefined,
): Promise<unknown> {
  const row = await ownedRow(id, orgId);
  if (!row || !runOwnedByUser(row.state, userId)) return null;
  return toMemberView(row);
}

export async function pgSuperadminRunView(id: string): Promise<
  | {
      id: string;
      headline: string;
      ctx: { name: string; role: string; seniority: string; meetingType: string };
      briefing: unknown;
      lastSeenAt: number;
      completedAt: number | null;
      rating: { stars: number; note: string; updatedAt: string | null } | null;
    }
  | null
> {
  const row = await rowByKey(id);
  if (!row || !row.state.briefing) return null;
  return {
    id: row.id,
    headline: buildHeadline(asRecord(row.state.ctx)),
    ctx: ctxOf(row.state),
    briefing: row.state.briefing ?? null,
    lastSeenAt: asNumber(row.state.lastSeenAt),
    completedAt: typeof row.state.completedAt === "number" ? row.state.completedAt : null,
    rating: ratingFromValue(row.rating),
  };
}

export async function pgSummarizeRun(id: string, orgId?: string | null): Promise<unknown> {
  const row = await ownedRow(id, orgId);
  if (!row) return null;
  const ctx = asRecord(row.state.ctx);
  const headline = buildHeadline(ctx);
  const who = asString(ctx.name) || "(no name)";
  const roleBits = [ctx.seniority, ctx.role].filter(Boolean).join(" ");
  const overview = `For ${who}${roleBits ? ` (${roleBits})` : ""}. ${notesSummary(row.state.notes)}`;
  return {
    id,
    headline,
    overview,
    notes: Array.isArray(row.state.notes) ? row.state.notes : [],
    stage: inferStage(row.state),
    ...overviewFields(row.state),
  };
}

export async function pgCompareRun(id: string, orgId?: string | null): Promise<unknown> {
  const row = await ownedRow(id, orgId);
  if (!row) return null;
  const arts = await artifactsFor(row.id);
  const transcript: unknown[] = Array.isArray(row.state.transcript) ? row.state.transcript : [];
  const focus = artifactValue(pick(arts, "01-focus-points", "response.json"));
  const prepRaw = artifactValue(pick(arts, "01b-preparation", "response.json"));
  const prep = isObjectRecord(prepRaw) ? prepRaw.brief || prepRaw : null;
  return {
    id,
    headline: buildHeadline(asRecord(row.state.ctx)),
    ctx: isObjectRecord(row.state.ctx) ? row.state.ctx : {},
    mode: row.state.mode || "manual",
    runLabel: row.state.runLabel ?? null,
    fingerprint: row.state.fingerprint ?? null,
    verdict: row.state.verdict ?? null,
    notes: Array.isArray(row.state.notes) ? row.state.notes : [],
    stage: inferStage(row.state),
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
    briefing: row.state.briefing || null,
    review: row.review || null,
    // script-coverage.json stays a Phase-5 sidecar; the state copy is the same
    // object the lanes stamp — the parity test seeds both identically.
    scriptCoverage: row.state.scriptCoverage ?? null,
  };
}

function turnsFromArtifacts(arts: ArtifactRow[]): Array<Record<string, unknown>> {
  return arts
    .filter((a) => a.stage === TURNS_STAGE && /^\d+-turn\.json$/.test(a.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((a) => {
      const t = asRecord(artifactValue(a));
      const padTok = a.name.slice(0, a.name.indexOf("-"));
      const prompt = artifactText(pick(arts, TURNS_STAGE, `${padTok}-prompt.md`));
      const raw =
        parseLoose(artifactText(pick(arts, TURNS_STAGE, `${padTok}-response.json`))) ?? {
          assessment: t.assessment ?? null,
          new_queue: t.new_queue ?? null,
          issues: t.issues ?? null,
        };
      const question = asRecord(t.question);
      return {
        turn: t.turn ?? Number(padTok),
        question: question.name ?? (typeof t.question === "string" ? t.question : null),
        answer: t.answer ?? null,
        skipped: Boolean(t.skipped),
        prompt,
        raw,
      };
    });
}

export async function pgReadRunStages(id: string, orgId?: string | null): Promise<unknown> {
  const row = await ownedRow(id, orgId);
  if (!row) return null;
  const arts = await artifactsFor(row.id);
  const out: Array<Record<string, unknown>> = [];
  const push = (key: string, label: string): void => {
    const inputs = artifactValue(pick(arts, key, "inputs.json"));
    const prompt = artifactText(pick(arts, key, "prompt.md"));
    const raw = parseLoose(artifactText(pick(arts, key, "response.json")));
    if (inputs == null && prompt == null && raw == null) return;
    const finalText = artifactText(pick(arts, key, "final.json"));
    const entry: Record<string, unknown> = { key, label, inputs, prompt, raw };
    if (finalText != null) entry.final = parseLoose(finalText);
    out.push(entry);
  };
  push("01-focus-points", "Focus areas");
  push("01b-preparation", "Prep brief");
  push("03-question-bank", "Questions");
  const turns = turnsFromArtifacts(arts);
  if (turns.length) out.push({ key: TURNS_STAGE, label: "Live Q&A", turns });
  push("05-evaluation", "Synthesis");
  return out;
}

/** A run's saved state (the authoritative jsonb copy), or null when unknown. */
export async function pgReadState(runId: string): Promise<Record<string, unknown> | null> {
  const row = await rowByKey(runId);
  return row ? row.state : null;
}

/** One stage file's raw text (prompt.md / response.json). With `latestNumbered`
 *  (the questioning stage) the per-turn files are numbered — return the last. */
export async function pgReadStageText(
  runId: string,
  stageDir: string,
  name: string,
  latestNumbered = false,
): Promise<string | null> {
  const row = await rowByKey(runId);
  if (!row) return null;
  const arts = await artifactsFor(row.id);
  if (!latestNumbered) return artifactText(pick(arts, stageDir, name));
  const numbered = arts
    .filter((a) => a.stage === stageDir && a.name.endsWith(name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return artifactText(numbered[numbered.length - 1]);
}

export async function pgReadPipelineLock(id: string): Promise<unknown> {
  const row = await rowByKey(id);
  if (!row) return null;
  const lock = artifactValue(pick(await artifactsFor(row.id), "", "pipeline-lock.json"));
  return isObjectRecord(lock) ? lock : null;
}

export async function pgFindLatestRun(): Promise<unknown> {
  const rows = await rowsWhere([], 1);
  const first = rows[0];
  if (!first) return null;
  return {
    id: first.id,
    headline: buildHeadline(asRecord(first.state.ctx)),
    lock: await pgReadPipelineLock(first.id),
  };
}

export async function pgFindLatestRunWithLock(): Promise<unknown> {
  const rows = await rowsWhere([]);
  for (const r of rows) {
    const lock = await pgReadPipelineLock(r.id);
    if (lock) {
      return { id: r.id, headline: buildHeadline(asRecord(r.state.ctx)), lock };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Writes (delete / archive / review / rating / clone) — column + file echo
// ---------------------------------------------------------------------------

export async function pgDeleteRun(
  id: string,
  orgId?: string | null,
): Promise<{ deleted: boolean; id: string; reason?: string; dir?: string }> {
  const row = await ownedRow(id, orgId);
  if (!row) return { deleted: false, id, reason: "not_found" };
  await getDb().delete(runArtifacts).where(eq(runArtifacts.sessionKey, row.id));
  await getDb().delete(sessionsTable).where(eq(sessionsTable.sessionKey, row.id));
  // Remove the disk echo too — otherwise a rollback to the file store would
  // resurrect a run the manager deleted.
  try {
    if (fs.existsSync(row.dir)) fs.rmSync(row.dir, { recursive: true, force: true });
  } catch {
    // disk echo cleanup is best-effort; the DB row (the truth) is gone
  }
  return { deleted: true, id, dir: row.dir };
}

function echoSidecar(dir: string, name: string, data: unknown): void {
  if (!shouldEchoToDisk()) return;
  try {
    if (!fs.existsSync(dir)) return; // no echo folder for this run — nothing to mirror
    const target = path.join(dir, name);
    const tmp = path.join(dir, name + ".tmp");
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, target);
  } catch (e) {
    console.warn(`[runs-store] sidecar echo failed (${name}):`, e instanceof Error ? e.message : String(e));
  }
}

export async function pgSetArchived(
  id: string,
  archived: unknown,
  orgId?: string | null,
): Promise<{ ok: boolean; id: string; reason?: string; archived?: boolean }> {
  const row = await ownedRow(id, orgId);
  if (!row) return { ok: false, id, reason: "not_found" };
  const flag = Boolean(archived);
  await getDb()
    .update(sessionsTable)
    .set({ archivedAt: flag ? new Date() : null, updatedAt: new Date() })
    .where(eq(sessionsTable.sessionKey, row.id));
  echoSidecar(row.dir, "archive.json", { version: 1, runId: id, archived: flag, updatedAt: new Date().toISOString() });
  return { ok: true, id, archived: flag };
}

export async function pgRunExists(id: string, orgId?: string | null): Promise<boolean> {
  return (await ownedRow(id, orgId)) !== null;
}

export async function pgReadReview(id: string, orgId?: string | null): Promise<unknown> {
  const row = await ownedRow(id, orgId);
  return row ? (row.review ?? null) : null;
}

export async function pgWriteReview(id: string, orgId: string | null | undefined, data: unknown): Promise<void> {
  const row = await ownedRow(id, orgId);
  if (!row) throw new Error("unknown run");
  await getDb().update(sessionsTable).set({ review: data, updatedAt: new Date() }).where(eq(sessionsTable.sessionKey, row.id));
  echoSidecar(row.dir, "review.json", data);
}

export async function pgReadRating(id: string, orgId?: string | null): Promise<unknown> {
  const row = await ownedRow(id, orgId);
  return row ? (row.rating ?? null) : null;
}

export async function pgWriteRating(id: string, orgId: string | null | undefined, data: unknown): Promise<void> {
  const row = await ownedRow(id, orgId);
  if (!row) throw new Error("unknown run");
  await getDb().update(sessionsTable).set({ rating: data, updatedAt: new Date() }).where(eq(sessionsTable.sessionKey, row.id));
  echoSidecar(row.dir, "rating.json", data);
}

// Copy a FINISHED run into a fresh run owned by the caller (dev-only route, see
// run-history.cloneRun). Source lookup is unfenced on purpose — same contract.
export async function pgCloneRun(
  sourceId: unknown,
  orgId: string | null,
  userId: string | null,
): Promise<{ id: string } | null> {
  const source = await rowByKey(sourceId);
  if (!source || !source.state.briefing) return null;
  await ensureDefaultOrg();
  const { id, dir } = createSession(); // mints id + queues a fresh lock artifact
  const cloned = cloneRunState(source.state, { id, dir, orgId, userId, now: Date.now() });

  await getDb()
    .insert(sessionsTable)
    .values({
      orgId: orgId ?? DEFAULT_ORG_ID,
      sessionKey: id,
      state: cloned,
      logDir: dir,
      completedAt: new Date(),
      userId: userId ?? null,
      personId: (cloned.personId as string | null) ?? null,
      personName: asString(asRecord(cloned.ctx).name) || null,
      role: asString(asRecord(cloned.ctx).role) || null,
      seniority: asString(asRecord(cloned.ctx).seniority) || null,
      meetingType: asString(asRecord(cloned.ctx).meetingType) || null,
      finished: true,
      lastSeenAt: asNumber(cloned.lastSeenAt),
      mode: asString(cloned.mode) || "manual",
      personaId: asString(asRecord(cloned.fingerprint).personaId) || null,
      runLabel: asString(cloned.runLabel) || null,
    })
    .onConflictDoNothing();

  // Copy the source's artifacts under the new key (the fresh pipeline-lock from
  // createSession is overwritten by the source's — mirroring the file cpSync).
  const arts = await artifactsFor(source.id);
  for (const a of arts) {
    await getDb()
      .insert(runArtifacts)
      .values({ sessionKey: id, orgId: orgId ?? null, stage: a.stage, name: a.name, kind: a.kind, content: a.content, contentText: a.contentText })
      .onConflictDoUpdate({
        target: [runArtifacts.sessionKey, runArtifacts.stage, runArtifacts.name],
        set: { kind: a.kind, content: a.content, contentText: a.contentText, updatedAt: new Date() },
      });
  }

  // Disk echo: mirror the file store's cpSync + fresh state stamp when the
  // source has an echo folder to copy.
  if (shouldEchoToDisk() && fs.existsSync(source.dir)) {
    try {
      fs.cpSync(source.dir, dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "session-state.json"), JSON.stringify(cloned, null, 2));
    } catch (e) {
      console.warn("[runs-store] clone echo failed:", e instanceof Error ? e.message : String(e));
    }
  }
  return { id };
}
