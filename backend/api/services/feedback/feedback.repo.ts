// Data access for tester feedback — the storage seam, now Postgres-backed
// (feedback-inbox: replaces the Phase-5 JSONL file so the superadmin Feedback screen
// can read notes back). One INSERT per note; reads LEFT JOIN users + organizations for
// a name + company (LEFT so a note survives odd identity states), newest first — the
// same shape as error-log.repo.ts. The service depends on the interface, so it's
// unit-tested against an in-memory fake without a database.

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { feedbackNotes, users, organizations } from "../../../db/schema.ts";

// One feedback note as stored. Kept minimal on purpose (simplicity rule): the message,
// who sent it, when, and the page they were on — nothing speculative. `runId`/`verdict`
// only appear on a briefing verdict tap (validation-kit Phase 3).
export interface FeedbackRecord {
  at: string; // ISO timestamp, stamped by the controller
  userId: string | null;
  orgId: string | null;
  message: string;
  page?: string;
  runId?: string;
  verdict?: "yes" | "no";
}

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
  createdAt: Date;
}

export interface FeedbackRepo {
  append(record: FeedbackRecord): Promise<void>;
  /** Write a briefing verdict tap, ONE row per run: re-tapping or adding the comment
   *  updates that run's row (keeping its original tap time) instead of inserting a
   *  duplicate. The comment is only overwritten when the new record carries one. */
  upsertVerdict(record: FeedbackRecord & { runId: string; verdict: "yes" | "no" }): Promise<void>;
  /** The most recent `limit` notes across every company, newest first. */
  listRecent(limit: number): Promise<FeedbackNoteRow[]>;
  /** Permanently delete one note. Returns true if a row matched the id, false if none did. */
  remove(id: string): Promise<boolean>;
}

export const pgFeedbackRepo: FeedbackRepo = {
  async append(record) {
    const db = getDb();
    await db.insert(feedbackNotes).values({
      orgId: record.orgId,
      userId: record.userId,
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
    const set: { verdict: string; userId: string | null; orgId: string | null; message?: string } = {
      verdict: record.verdict,
      userId: record.userId,
      orgId: record.orgId,
    };
    if (record.message) set.message = record.message;
    const updated = await db
      .update(feedbackNotes)
      .set(set)
      .where(eq(feedbackNotes.runId, record.runId))
      .returning({ id: feedbackNotes.id });
    if (updated.length > 0) return;
    await db.insert(feedbackNotes).values({
      orgId: record.orgId,
      userId: record.userId,
      message: record.message,
      runId: record.runId,
      verdict: record.verdict,
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
