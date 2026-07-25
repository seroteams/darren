// The ONE home for run-row shapes (refactor-2026-07 P6). The file store
// (engine/run-history.ts) and the Postgres store (db/runs-store.ts) used to
// carry copy-pasted twins of every projection, kept in sync only by "kept in
// parity with…" comments; now both build a RunFacts and call the same
// functions, so a new run field can't silently diverge — and the pg-parity
// test (backend/tests/runs/test-pg-runs-parity.js) checks the result anyway.
//
// Everything here is VALUE-based (state jsonb / sidecar values, no fs, no SQL):
// the file store normalises its sidecar files into RunFacts, the PG store its
// columns. The dir-reading halves (ratingOf, reviewSummaryOf, isArchivedAt)
// stay in run-history.ts.

import { isObjectRecord, asRecord, asString } from "../shared/guards.ts";
import { classifyAnswer } from "./read-quality.ts";

function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

// In-app run review (QA tooling). reviewStatus is always derived from marks —
// never stored as a separate truth. REVIEW_DIM_KEYS is the single source of
// truth for the 8 verdict dimensions on the server; the review handler imports
// it. (The client UI keeps its own DIMENSIONS list with labels/hints — keep
// the keys in sync.)
export const REVIEW_DIM_KEYS = ["role_aware", "meeting_aware", "grounded", "evidence", "no_overreach", "trust", "next_actions", "briefing_usable"];

export function reviewStatusOf(review: unknown): string {
  const marks: Record<string, unknown> = isObjectRecord(review) && isObjectRecord(review.marks) ? review.marks : {};
  const decided = REVIEW_DIM_KEYS.filter((k) => marks[k] === "pass" || marks[k] === "fail").length;
  if (decided === 0) return "none";
  if (decided >= REVIEW_DIM_KEYS.length) return "complete";
  return "partial";
}

// Library badge inputs derived from a run's review: completeness, the manual
// overall verdict (keep/fix/block), and how many dimensions failed.
export function reviewSummaryFromValue(review: unknown): {
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

export type ReviewSummary = ReturnType<typeof reviewSummaryFromValue>;

// Which persona (if any) a run was driven by, and whether it was scripted.
// Read off saved state: the scripted lane stamps fingerprint.personaId at start
// and mode is persisted on every save. Manual runs come back {null, "manual"}.
export function personaTagOf(state: unknown): { personaId: string | null; mode: string } {
  const s = asRecord(state);
  const fp = asRecord(s.fingerprint);
  return {
    personaId: asString(fp.personaId) || null,
    mode: asString(s.mode) || "manual",
  };
}

// The manager's own 1:1 rating for a run (pre-go-live PG3), or null. Only a
// valid 1-5 star shape surfaces.
export type Rating = { stars: number; note: string; updatedAt: string | null };

export function ratingFromValue(r: unknown): Rating | null {
  if (!isObjectRecord(r)) return null;
  const stars = asNumber(r.stars);
  if (stars < 1 || stars > 5) return null;
  return { stars, note: asString(r.note), updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null };
}

// The run's model spend off its saved briefing (universe-monitoring P3), or null when
// absent/malformed — a run that predates cost tracking must never claim "$0.00".
export function costFromState(state: unknown): { usd: number; calls: number | null } | null {
  const s = asRecord(state);
  const cost = asRecord(asRecord(s.briefing).cost);
  if (typeof cost.usd_total !== "number") return null;
  return { usd: cost.usd_total, calls: typeof cost.call_count === "number" ? cost.call_count : null };
}

export function buildHeadline(ctx: Record<string, unknown>): string {
  return [ctx.name, ctx.role, ctx.seniority, ctx.meetingType]
    .filter((s) => s && String(s).trim())
    .join(" · ");
}

// The manager-confirmed agreements a finished run carries (Promises loop phase 3),
// projected for the read-only member surfaces with the check-in outcome phase 2
// wrote back. The internal `at` timestamp is dropped, and a run that armed no
// loop returns null — so callers render nothing, not empty scaffolding.
export function promiseHistoryOf(
  state: unknown,
): Array<{ id: string; owner: string; action: string; when: string; outcome: string | null }> | null {
  const s = asRecord(state);
  const raw = Array.isArray(s.promises) ? s.promises : [];
  const rows = raw
    .map((p) => asRecord(p))
    .filter((p) => asString(p.id))
    .map((p) => ({
      id: asString(p.id),
      owner: asString(p.owner),
      action: asString(p.action),
      when: asString(p.when),
      outcome:
        p.outcome === "yes" || p.outcome === "partly" || p.outcome === "no" || p.outcome === "changed"
          ? p.outcome
          : null,
    }));
  return rows.length ? rows : null;
}

/* ---------------------------------------------------------------------------
   Row projections — both stores call these with a normalised RunFacts
--------------------------------------------------------------------------- */

// What a projection needs to know about one run, however it was stored.
// `rating`/`archived`/`reviewSummary` are the sidecar VALUES: the file store
// reads them from the run folder (ratingOf/isArchivedAt/reviewSummaryOf), the
// PG store from its columns (ratingFromValue/archived_at/reviewSummaryFromValue).
export interface RunFacts {
  id: string;
  state: Record<string, unknown>;
  rating: Rating | null;
  archived?: boolean;
  reviewSummary?: ReviewSummary;
}

export function projectCtx(state: Record<string, unknown>): { name: string; role: string; seniority: string; meetingType: string } {
  const ctx = asRecord(state.ctx);
  return {
    name: asString(ctx.name),
    role: asString(ctx.role),
    seniority: asString(ctx.seniority),
    meetingType: asString(ctx.meetingType),
  };
}

// Library row (QA tooling): review badge inputs so the Library can show
// verdict + failed count without opening the run.
export function finishedRow(f: RunFacts): Record<string, unknown> {
  return {
    id: f.id,
    headline: buildHeadline(asRecord(f.state.ctx)),
    ctx: projectCtx(f.state),
    lastSeenAt: asNumber(f.state.lastSeenAt),
    archived: Boolean(f.archived),
    // Bare stars number only — the manager's private note never rides this admin feed.
    rating: f.rating?.stars ?? null,
    cost: costFromState(f.state),
    ...personaTagOf(f.state),
    ...(f.reviewSummary ?? reviewSummaryFromValue(null)),
  };
}

// A member's own run in their list (member-nav Phase 2): lightweight,
// member-safe shape (no QA review / archive fields); `finished` kept honest so
// the Team can show "prep in progress".
export function memberRow(f: RunFacts): Record<string, unknown> {
  return {
    id: f.id,
    personId: asString(f.state.personId) || null, // people-roster Phase 4: join runs to the roster
    headline: buildHeadline(asRecord(f.state.ctx)),
    ctx: projectCtx(f.state),
    lastSeenAt: asNumber(f.state.lastSeenAt),
    finished: Boolean(f.state.briefing),
    rating: f.rating,
  };
}

// "1:1s about me" (people-roster Phase 5): deliberately MINIMAL — meeting type
// + when + who ran it; manager notes/briefings/ratings never ride this row
// (no-inference ruling).
export function aboutPersonRow(id: string, state: Record<string, unknown>): Record<string, unknown> {
  return {
    id,
    meetingType: asString(asRecord(state.ctx).meetingType),
    lastSeenAt: asNumber(state.lastSeenAt),
    completedAt: asNumber(state.completedAt) || null,
    userId: asString(state.userId) || null,
  };
}

// One user's / a guest's finished run, newest-first feeds (pre-go-live PG7/PG8).
export function userRunRow(f: RunFacts): {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: Rating | null;
} {
  return {
    id: f.id,
    headline: buildHeadline(asRecord(f.state.ctx)),
    ctx: projectCtx(f.state),
    lastSeenAt: asNumber(f.state.lastSeenAt),
    rating: f.rating,
  };
}

// The raw Q&A behind the briefing (member Answers tab). Mirrors compareRun's
// projection but WITHOUT the internal `note` — planner notes carry [SHALLOW]/[SKIP]
// markers that must never reach a manager.
export function memberTurns(transcript: unknown[]): Array<Record<string, unknown>> {
  return transcript.map((t) => {
    const entry = asRecord(t);
    const question = asRecord(entry.question);
    return {
      alias: question.alias ?? null,
      name: question.name ?? null,
      answer: entry.answer ?? null,
      skipped: Boolean(entry.skipped),
      // The per-turn read-quality tag (read-quality.ts). A clean 4-way label
      // (skip/decline/thin/note), not raw note text, so it's safe to surface.
      // Runs from before the tag existed derive it on the fly (note is read to
      // detect [SHALLOW] but never itself exposed).
      read: entry.read ?? classifyAnswer(entry.answer, entry.note),
    };
  });
}

// A read-only view of ONE of the member's own runs (member-nav Phase 2): the
// briefing plus its context, the Q&A, and the promises loop's history.
export function memberView(f: RunFacts, transcript: unknown[]): Record<string, unknown> {
  return {
    id: f.id,
    headline: buildHeadline(asRecord(f.state.ctx)),
    ctx: projectCtx(f.state),
    briefing: f.state.briefing ?? null,
    turns: memberTurns(transcript),
    lastSeenAt: asNumber(f.state.lastSeenAt),
    completedAt: f.state.completedAt ?? null,
    rating: f.rating,
    // null when this run armed no loop, so the read views show nothing rather than a shell.
    promises: promiseHistoryOf(f.state),
  };
}
