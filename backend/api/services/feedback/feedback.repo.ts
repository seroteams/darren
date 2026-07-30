// Data access for tester feedback — the storage seam, now Postgres-backed
// (feedback-inbox: replaces the Phase-5 JSONL file so the superadmin Feedback screen
// can read notes back). One INSERT per note; reads LEFT JOIN users + organizations for
// a name + company (LEFT so a note survives odd identity states), newest first — the
// same shape as error-log.repo.ts. The service depends on the interface, so it's
// unit-tested against an in-memory fake without a database.

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { feedbackNotes, users, organizations } from "../../../db/schema.ts";

// One feedback note as stored. Kept minimal on purpose (simplicity rule): the message,
// who sent it, when, and the page they were on — nothing speculative. `runId`/`verdict`
// only appear on a briefing verdict tap (validation-kit Phase 3); `stars` only on a prep
// brief rating (brief-star-rating). `kind` says which of the two a run-tied row is.
export interface FeedbackRecord {
  at: string; // ISO timestamp, stamped by the controller
  userId: string | null;
  orgId: string | null;
  message: string;
  page?: string;
  runId?: string;
  verdict?: "yes" | "no";
  stars?: number;
  kind?: FeedbackNoteKind;
}

/** The two run-tied feedback moments. A plain Send-feedback note carries neither. */
export type FeedbackNoteKind = "verdict" | "brief_rating";

/** One note as read for the Feedback screen (createdAt is a Date; the service turns it into ISO). */
export interface FeedbackNoteRow {
  id: string;
  email: string | null;
  userName: string | null;
  company: string | null;
  page: string | null;
  message: string;
  runId: string | null;
  verdict: string | null;
  stars: number | null;
  kind: string | null;
  createdAt: Date;
}

export interface FeedbackRepo {
  append(record: FeedbackRecord): Promise<void>;
  /** Write a briefing verdict tap, ONE row per run: re-tapping or adding the comment
   *  updates that run's row (keeping its original tap time) instead of inserting a
   *  duplicate. The comment is only overwritten when the new record carries one. */
  upsertVerdict(record: FeedbackRecord & { runId: string; verdict: "yes" | "no" }): Promise<void>;
  /** Write the prep brief's 1-5 score, ONE row per run: re-tapping a different score
   *  updates that run's row. Scoped to its own kind, so it never lands on the recap
   *  verdict's row for the same run. */
  upsertBriefRating(record: FeedbackRecord & { runId: string; stars: number }): Promise<void>;
  /** The most recent `limit` notes across every company, newest first. */
  listRecent(limit: number): Promise<FeedbackNoteRow[]>;
  /** Permanently delete one note. Returns true if a row matched the id, false if none did. */
  remove(id: string): Promise<boolean>;
}

// feedback_notes.org_id / user_id are uuid columns. A synthetic dev identity
// (DEV_AUTOLOGIN) carries non-uuid ids like "dev-org" / "dev-user"; writing that literal
// into a uuid column throws "invalid input syntax for type uuid" — every local verdict
// tap 500'd and the note was lost. Unlike the read repos (people.repo.ts et al) we must
// NOT short-circuit here: the note is the whole point. Store it with a null author
// instead — the reads LEFT JOIN, so it lists with no name / no company, which is true.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOrNull = (v: string | null): string | null => (v && UUID_RE.test(v) ? v : null);

/** The two uuid-keyed author columns, safe to write for any caller. Exported for its test. */
export function identityColumns(record: { orgId: string | null; userId: string | null }): {
  orgId: string | null;
  userId: string | null;
} {
  return { orgId: uuidOrNull(record.orgId), userId: uuidOrNull(record.userId) };
}

export const pgFeedbackRepo: FeedbackRepo = {
  async append(record) {
    const db = getDb();
    await db.insert(feedbackNotes).values({
      ...identityColumns(record),
      message: record.message,
      page: record.page ?? null,
      createdAt: new Date(record.at),
    });
  },
  async upsertVerdict(record) {
    const db = getDb();
    // One row per run: update the existing tap (verdict, and the comment only when a
    // new one arrives — an empty re-tap must not wipe an earlier comment); insert on
    // the first tap. run_id has no unique constraint, so this is a read-then-write —
    // fine for a human tapping one button.
    //
    // The kind filter is load-bearing (brief-star-rating): the prep brief now writes a
    // SECOND run-tied row for the same run. Matching on run_id alone would let a verdict
    // tap land on the brief rating's row and wipe the score. Legacy rows were stamped
    // kind = 'verdict' by migration 0023, so they still match.
    const set: { verdict: string; kind: string; userId: string | null; orgId: string | null; message?: string } = {
      verdict: record.verdict,
      kind: "verdict",
      ...identityColumns(record),
    };
    if (record.message) set.message = record.message;
    const updated = await db
      .update(feedbackNotes)
      .set(set)
      .where(and(eq(feedbackNotes.runId, record.runId), eq(feedbackNotes.kind, "verdict")))
      .returning({ id: feedbackNotes.id });
    if (updated.length > 0) return;
    await db.insert(feedbackNotes).values({
      ...identityColumns(record),
      message: record.message,
      runId: record.runId,
      verdict: record.verdict,
      kind: "verdict",
      createdAt: new Date(record.at),
    });
  },
  async upsertBriefRating(record) {
    const db = getDb();
    // Same read-then-write shape as upsertVerdict, scoped to this kind so the two
    // run-tied moments stay independent. Re-tapping a different score overwrites the
    // score and keeps the original tap time — the first reaction is when it happened.
    const updated = await db
      .update(feedbackNotes)
      .set({ stars: record.stars, kind: "brief_rating", ...identityColumns(record) })
      .where(and(eq(feedbackNotes.runId, record.runId), eq(feedbackNotes.kind, "brief_rating")))
      .returning({ id: feedbackNotes.id });
    if (updated.length > 0) return;
    await db.insert(feedbackNotes).values({
      ...identityColumns(record),
      message: record.message,
      runId: record.runId,
      stars: record.stars,
      kind: "brief_rating",
      createdAt: new Date(record.at),
    });
  },
  async listRecent(limit) {
    const db = getDb();
    return db
      .select({
        id: feedbackNotes.id,
        email: users.email,
        userName: users.name,
        company: organizations.name,
        page: feedbackNotes.page,
        message: feedbackNotes.message,
        runId: feedbackNotes.runId,
        verdict: feedbackNotes.verdict,
        stars: feedbackNotes.stars,
        kind: feedbackNotes.kind,
        createdAt: feedbackNotes.createdAt,
      })
      .from(feedbackNotes)
      .leftJoin(users, eq(feedbackNotes.userId, users.id))
      .leftJoin(organizations, eq(feedbackNotes.orgId, organizations.id))
      .orderBy(desc(feedbackNotes.createdAt))
      .limit(limit);
  },
  async remove(id) {
    const db = getDb();
    const gone = await db.delete(feedbackNotes).where(eq(feedbackNotes.id, id)).returning({ id: feedbackNotes.id });
    return gone.length > 0;
  },
};
