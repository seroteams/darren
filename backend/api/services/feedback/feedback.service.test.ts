import { test } from "node:test";
import assert from "node:assert/strict";
import { createFeedbackService } from "./feedback.service.ts";
import type { FeedbackRepo, FeedbackRecord } from "./feedback.repo.ts";

// An in-memory repo proves the service logic is storage-agnostic — no real disk write
// in the test (the Phase 004 injected-boundary seam; mirrors catalog.service.test.ts).
function fakeRepo(): { repo: FeedbackRepo; records: FeedbackRecord[] } {
  const records: FeedbackRecord[] = [];
  return { repo: { append: (r) => records.push(r) }, records };
}

const ID = { userId: "u1", orgId: "o1" };
const AT = "2026-07-01T00:00:00.000Z";

test("submit appends a stamped, trimmed record for a valid message", () => {
  const { repo, records } = fakeRepo();
  const out = createFeedbackService(repo).submit({ message: "  works great  " }, ID, AT);
  assert.deepEqual(out, { ok: true });
  assert.equal(records.length, 1);
  assert.equal(records[0]?.message, "works great"); // trimmed
  assert.equal(records[0]?.userId, "u1");
  assert.equal(records[0]?.orgId, "o1");
  assert.equal(records[0]?.at, AT);
});

test("submit rejects an empty/whitespace/non-string message and writes nothing", () => {
  const { repo, records } = fakeRepo();
  const service = createFeedbackService(repo);
  assert.throws(() => service.submit({ message: "   " }, ID, AT), /required/i);
  assert.throws(() => service.submit({ message: 123 }, ID, AT), /required/i);
  assert.throws(() => service.submit({ message: undefined }, ID, AT), /required/i);
  assert.equal(records.length, 0);
});

test("submit caps an over-length message at 2000 chars", () => {
  const { repo, records } = fakeRepo();
  createFeedbackService(repo).submit({ message: "x".repeat(5000) }, ID, AT);
  assert.equal(records[0]?.message.length, 2000);
});

test("submit records an optional page and omits it when absent", () => {
  const { repo, records } = fakeRepo();
  const service = createFeedbackService(repo);
  service.submit({ message: "hi", page: "/about" }, ID, AT);
  service.submit({ message: "hi2" }, ID, AT);
  assert.equal(records[0]?.page, "/about");
  assert.equal(records[1]?.page, undefined);
});

test("submit stamps a null identity for an unexpected anonymous caller", () => {
  const { repo, records } = fakeRepo();
  createFeedbackService(repo).submit({ message: "hi" }, { userId: null, orgId: null }, AT);
  assert.equal(records[0]?.userId, null);
  assert.equal(records[0]?.orgId, null);
});
