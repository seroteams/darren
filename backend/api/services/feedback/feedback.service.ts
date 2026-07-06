// Feedback service — validate a tester's note and hand it to the repo, and shape the
// stored notes into the view the superadmin Feedback screen renders (newest first,
// dates as ISO strings). No storage here, no model. Storage-agnostic (the repo is
// injected), so it's unit-tested with an in-memory fake. The timestamp is passed in
// by the controller to keep this pure.

import type { FeedbackRepo, FeedbackRecord, FeedbackNoteRow } from "./feedback.repo.ts";

const MAX_LEN = 2000; // a short note, not a transcript
const MAX_PAGE_LEN = 200;

/** How many recent notes the screen loads. Small N for the alpha — newest-first, no
 *  pagination yet (parked; same call as the Error log). */
const DEFAULT_LIMIT = 200;

export interface FeedbackInput {
  message: unknown;
  page?: unknown;
}

export interface FeedbackIdentity {
  userId: string | null;
  orgId: string | null;
}

/** One note as the screen shows it — the row, with the timestamp as an ISO string. */
export interface FeedbackNoteView {
  id: string;
  email: string | null;
  userName: string | null;
  company: string | null;
  page: string | null;
  message: string;
  createdAt: string;
}

export interface FeedbackService {
  submit(input: FeedbackInput, identity: FeedbackIdentity, at: string): Promise<{ ok: true }>;
  /** The most recent notes across every company, newest first. */
  listRecent(): Promise<{ notes: FeedbackNoteView[] }>;
  /** Permanently delete one note. 400 on a missing id, 404 when nothing matches. */
  remove(id: string): Promise<{ id: string }>;
}

function toView(r: FeedbackNoteRow): FeedbackNoteView {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

export function createFeedbackService(repo: FeedbackRepo): FeedbackService {
  return {
    async submit(input, identity, at) {
      const raw = typeof input.message === "string" ? input.message.trim() : "";
      if (!raw) throw Object.assign(new Error("A message is required."), { status: 400 });

      const record: FeedbackRecord = {
        at,
        userId: identity.userId,
        orgId: identity.orgId,
        message: raw.slice(0, MAX_LEN),
      };
      const page = typeof input.page === "string" ? input.page.trim() : "";
      if (page) record.page = page.slice(0, MAX_PAGE_LEN);

      await repo.append(record);
      return { ok: true };
    },
    async listRecent() {
      const rows = await repo.listRecent(DEFAULT_LIMIT);
      return { notes: rows.map(toView) };
    },
    async remove(id) {
      const key = typeof id === "string" ? id.trim() : "";
      if (!key) throw Object.assign(new Error("An id is required."), { status: 400 });
      const removed = await repo.remove(key);
      if (!removed) throw Object.assign(new Error("Feedback note not found."), { status: 404 });
      return { id: key };
    },
  };
}
