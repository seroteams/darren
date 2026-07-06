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
// who sent it, when, and the page they were on — nothing speculative.
export interface FeedbackRecord {
  at: string; // ISO timestamp, stamped by the controller
  userId: string | null;
  orgId: string | null;
  message: string;
  page?: string;
}

/** One note as read for the Feedback screen (createdAt is a Date; the service turns it into ISO). */
export interface FeedbackNoteRow {
  id: string;
  email: string | null;
  userName: string | null;
  company: string | null;
  page: string | null;
  message: string;
  createdAt: Date;
}

export interface FeedbackRepo {
  append(record: FeedbackRecord): Promise<void>;
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
