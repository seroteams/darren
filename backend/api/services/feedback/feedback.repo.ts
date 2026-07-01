// Data access for tester feedback — the storage seam. Appends one JSON line per note to
// a local file under content/data/feedback/. No external service (Phase 5's rule): Carl
// reads the file directly. A DB-backed impl can replace `fileFeedbackRepo` without
// touching the service.

import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../../../engine/paths.mts";

// One feedback note as stored. Kept minimal on purpose (simplicity rule): the message,
// who sent it, when, and the page they were on — nothing speculative.
export interface FeedbackRecord {
  at: string; // ISO timestamp, stamped by the controller
  userId: string | null;
  orgId: string | null;
  message: string;
  page?: string;
}

export interface FeedbackRepo {
  append(record: FeedbackRecord): void;
}

const FEEDBACK_DIR = path.join(DATA_DIR, "feedback");
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, "feedback.jsonl");

export const fileFeedbackRepo: FeedbackRepo = {
  append(record) {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    fs.appendFileSync(FEEDBACK_FILE, JSON.stringify(record) + "\n");
  },
};
