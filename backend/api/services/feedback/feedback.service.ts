// Feedback service — validate a tester's note and hand it to the repo. No storage here,
// no model. Storage-agnostic (the repo is injected), so it's unit-tested with an
// in-memory fake. The timestamp is passed in by the controller to keep this pure.

import type { FeedbackRepo, FeedbackRecord } from "./feedback.repo.ts";

const MAX_LEN = 2000; // a short note, not a transcript
const MAX_PAGE_LEN = 200;

export interface FeedbackInput {
  message: unknown;
  page?: unknown;
}

export interface FeedbackIdentity {
  userId: string | null;
  orgId: string | null;
}

export interface FeedbackService {
  submit(input: FeedbackInput, identity: FeedbackIdentity, at: string): { ok: true };
}

export function createFeedbackService(repo: FeedbackRepo): FeedbackService {
  return {
    submit(input, identity, at) {
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

      repo.append(record);
      return { ok: true };
    },
  };
}
