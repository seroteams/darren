import { test } from "node:test";
import assert from "node:assert/strict";
import { createFeedbackService } from "./feedback.service.ts";
import type { FeedbackRepo, FeedbackRecord, FeedbackNoteRow } from "./feedback.repo.ts";

// An in-memory repo proves the service logic is storage-agnostic — no real database
// in the test (the Phase 004 injected-boundary seam; mirrors error-log.service.test.ts).
function fakeRepo(rows: FeedbackNoteRow[] = []): { repo: FeedbackRepo; records: FeedbackRecord[]; limits: number[]; deleted: string[] } {
  const records: FeedbackRecord[] = [];
  const limits: number[] = [];
  const deleted: string[] = [];
  return {
    repo: {
      append: async (r) => { records.push(r); },
      listRecent: async (limit) => { limits.push(limit); return rows; },
      remove: async (id) => { deleted.push(id); return rows.some((r) => r.id === id); },
    },
    records,
    limits,
    deleted,
  };
}

const ID = { userId: "u1", orgId: "o1" };
const AT = "2026-07-01T00:00:00.000Z";

test("submit appends a stamped, trimmed record for a valid message", async () => {
  const { repo, records } = fakeRepo();
  const out = await createFeedbackService(repo).submit({ message: "  works great  " }, ID, AT);
  assert.deepEqual(out, { ok: true });
  assert.equal(records.length, 1);
  assert.equal(records[0]?.message, "works great"); // trimmed
  assert.equal(records[0]?.userId, "u1");
  assert.equal(records[0]?.orgId, "o1");
  assert.equal(records[0]?.at, AT);
});

test("submit rejects an empty/whitespace/non-string message and writes nothing", async () => {
  const { repo, records } = fakeRepo();
  const service = createFeedbackService(repo);
  await assert.rejects(() => service.submit({ message: "   " }, ID, AT), /required/i);
  await assert.rejects(() => service.submit({ message: 123 }, ID, AT), /required/i);
  await assert.rejects(() => service.submit({ message: undefined }, ID, AT), /required/i);
  assert.equal(records.length, 0);
});

test("submit caps an over-length message at 2000 chars", async () => {
  const { repo, records } = fakeRepo();
  await createFeedbackService(repo).submit({ message: "x".repeat(5000) }, ID, AT);
  assert.equal(records[0]?.message.length, 2000);
});

test("submit records an optional page and omits it when absent", async () => {
  const { repo, records } = fakeRepo();
  const service = createFeedbackService(repo);
  await service.submit({ message: "hi", page: "/about" }, ID, AT);
  await service.submit({ message: "hi2" }, ID, AT);
  assert.equal(records[0]?.page, "/about");
  assert.equal(records[1]?.page, undefined);
});

test("submit stamps a null identity for an unexpected anonymous caller", async () => {
  const { repo, records } = fakeRepo();
  await createFeedbackService(repo).submit({ message: "hi" }, { userId: null, orgId: null }, AT);
  assert.equal(records[0]?.userId, null);
  assert.equal(records[0]?.orgId, null);
});

test("listRecent maps rows to views with ISO dates and wraps them in { notes }", async () => {
  const row: FeedbackNoteRow = {
    id: "f1",
    email: "pat@acme.test",
    userName: "Pat",
    company: "Acme",
    page: "/team",
    message: "love it",
    createdAt: new Date("2026-07-05T10:00:00.000Z"),
  };
  const { repo } = fakeRepo([row]);
  const out = await createFeedbackService(repo).listRecent();
  assert.equal(out.notes.length, 1);
  assert.deepEqual(out.notes[0], {
    id: "f1",
    email: "pat@acme.test",
    userName: "Pat",
    company: "Acme",
    page: "/team",
    message: "love it",
    createdAt: "2026-07-05T10:00:00.000Z",
  });
});

test("listRecent asks the repo for a bounded number of rows and passes an empty list through", async () => {
  const { repo, limits } = fakeRepo();
  const out = await createFeedbackService(repo).listRecent();
  assert.deepEqual(out, { notes: [] });
  assert.equal(limits.length, 1);
  assert.ok((limits[0] ?? 0) > 0);
});

test("remove deletes an existing note and returns its id", async () => {
  const row: FeedbackNoteRow = {
    id: "f1", email: null, userName: null, company: null, page: null,
    message: "junk", createdAt: new Date(AT),
  };
  const { repo, deleted } = fakeRepo([row]);
  const out = await createFeedbackService(repo).remove("f1");
  assert.deepEqual(out, { id: "f1" });
  assert.deepEqual(deleted, ["f1"]);
});

test("remove rejects a missing id without touching the repo", async () => {
  const { repo, deleted } = fakeRepo();
  await assert.rejects(() => createFeedbackService(repo).remove("  "), /required/i);
  assert.equal(deleted.length, 0);
});

test("remove 404s when no row matches the id", async () => {
  const { repo } = fakeRepo();
  await assert.rejects(() => createFeedbackService(repo).remove("nope"), /not found/i);
});
