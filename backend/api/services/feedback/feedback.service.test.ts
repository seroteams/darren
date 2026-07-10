import { test } from "node:test";
import assert from "node:assert/strict";
import { createFeedbackService } from "./feedback.service.ts";
import type { FeedbackRepo, FeedbackRecord, FeedbackNoteRow } from "./feedback.repo.ts";

// An in-memory repo proves the service logic is storage-agnostic — no real database
// in the test (the Phase 004 injected-boundary seam; mirrors error-log.service.test.ts).
function fakeRepo(rows: FeedbackNoteRow[] = []): { repo: FeedbackRepo; records: FeedbackRecord[]; verdicts: FeedbackRecord[]; limits: number[]; deleted: string[] } {
  const records: FeedbackRecord[] = [];
  const verdicts: FeedbackRecord[] = [];
  const limits: number[] = [];
  const deleted: string[] = [];
  return {
    repo: {
      append: async (r) => { records.push(r); },
      upsertVerdict: async (r) => { verdicts.push(r); },
      listRecent: async (limit) => { limits.push(limit); return rows; },
      remove: async (id) => { deleted.push(id); return rows.some((r) => r.id === id); },
    },
    records,
    verdicts,
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
    runId: null,
    verdict: null,
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
    runId: null,
    verdict: null,
    createdAt: "2026-07-05T10:00:00.000Z",
  });
});

// --- validation-kit Phase 3: the briefing verdict tap ----------------------
// One question at the moment of value ("Would you run this 1:1 differently now?"),
// stored per run — a tap upserts, so changing the answer or adding the comment
// later lands on the SAME row, never a duplicate.

test("submitVerdict upserts a yes/no tied to the run, comment optional", async () => {
  const { repo, verdicts, records } = fakeRepo();
  const out = await createFeedbackService(repo).submitVerdict(
    { runId: "run-1", verdict: "yes" }, ID, AT,
  );
  assert.deepEqual(out, { ok: true });
  assert.equal(records.length, 0); // never mixed into the plain-note path
  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.runId, "run-1");
  assert.equal(verdicts[0]?.verdict, "yes");
  assert.equal(verdicts[0]?.message, ""); // no comment yet — still a valid row
  assert.equal(verdicts[0]?.at, AT);
  assert.equal(verdicts[0]?.userId, "u1");
});

test("submitVerdict trims and caps the optional comment", async () => {
  const { repo, verdicts } = fakeRepo();
  await createFeedbackService(repo).submitVerdict(
    { runId: "run-1", verdict: "no", message: "  " + "x".repeat(5000) }, ID, AT,
  );
  assert.equal(verdicts[0]?.verdict, "no");
  assert.equal(verdicts[0]?.message.length, 2000);
});

test("submitVerdict rejects anything but yes/no and writes nothing", async () => {
  const { repo, verdicts } = fakeRepo();
  const service = createFeedbackService(repo);
  await assert.rejects(() => service.submitVerdict({ runId: "r", verdict: "maybe" }, ID, AT), /yes or no/i);
  await assert.rejects(() => service.submitVerdict({ runId: "r", verdict: 1 }, ID, AT), /yes or no/i);
  assert.equal(verdicts.length, 0);
});

test("submitVerdict rejects a missing run id and writes nothing", async () => {
  const { repo, verdicts } = fakeRepo();
  await assert.rejects(() => createFeedbackService(repo).submitVerdict({ runId: "  ", verdict: "yes" }, ID, AT), /run/i);
  assert.equal(verdicts.length, 0);
});

test("submitVerdict accepts an anonymous caller — a guest's tap still counts", async () => {
  const { repo, verdicts } = fakeRepo();
  await createFeedbackService(repo).submitVerdict(
    { runId: "run-g", verdict: "yes" }, { userId: null, orgId: null }, AT,
  );
  assert.equal(verdicts[0]?.userId, null);
  assert.equal(verdicts[0]?.runId, "run-g");
});

test("listRecent passes a verdict row's runId and verdict through to the view", async () => {
  const row: FeedbackNoteRow = {
    id: "f2", email: null, userName: null, company: null, page: null,
    message: "", runId: "run-1", verdict: "yes",
    createdAt: new Date("2026-07-05T10:00:00.000Z"),
  };
  const { repo } = fakeRepo([row]);
  const out = await createFeedbackService(repo).listRecent();
  assert.equal(out.notes[0]?.runId, "run-1");
  assert.equal(out.notes[0]?.verdict, "yes");
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
    message: "junk", runId: null, verdict: null, createdAt: new Date(AT),
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
