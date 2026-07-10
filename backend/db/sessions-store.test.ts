import test from "node:test";
import assert from "node:assert/strict";
import { createWriteQueue, queueSessionUpsert, flushSessionWrites, liveSessionsQuery } from "./sessions-store.ts";
import { closeDb } from "./client.ts";
import type { Session } from "../shared/session.types.ts";

// Regression: 2026-07-08 — the session mirror fired one unbounded upsert per
// persist() call. Concurrent full-state upserts of the SAME session pile up on
// the row lock, each holding a pool client; with pg's unbounded waits that
// starved the pool and hung the API. The mirror must coalesce: at most one
// in-flight write per session, and only the LATEST queued state kept (every
// upsert writes the full current state, so intermediates are redundant).

test("write queue coalesces rapid same-key writes: one in flight, last state wins", async () => {
  const written: number[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const q = createWriteQueue<{ n: number }>(async (item) => {
    if (item.n === 1) await gate; // hold the first write in flight
    written.push(item.n);
  });
  q.enqueue("s1", { n: 1 });
  q.enqueue("s1", { n: 2 }); // superseded while 1 is in flight
  q.enqueue("s1", { n: 3 }); // superseded
  q.enqueue("s1", { n: 4 }); // latest — the only one that must land
  release();
  await q.flush();
  assert.deepEqual(written, [1, 4]);
});

test("write queue: different keys write independently — one stuck session can't block another", async () => {
  const written: string[] = [];
  let releaseA: () => void = () => {};
  const gateA = new Promise<void>((r) => (releaseA = r));
  const q = createWriteQueue<{ key: string }>(async (item) => {
    if (item.key === "a") await gateA;
    written.push(item.key);
  });
  q.enqueue("a", { key: "a" });
  q.enqueue("b", { key: "b" });
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(written, ["b"], "b lands while a is still in flight");
  releaseA();
  await q.flush();
  assert.deepEqual(written.sort(), ["a", "b"]);
});

test("write queue: a failed write is reported, swallowed, and later writes still run", async () => {
  const written: number[] = [];
  const errors: string[] = [];
  const q = createWriteQueue<{ n: number }>(
    async (item) => {
      if (item.n === 1) throw new Error("boom");
      written.push(item.n);
    },
    (key) => errors.push(key),
  );
  q.enqueue("s1", { n: 1 });
  await q.flush();
  q.enqueue("s1", { n: 2 });
  await q.flush();
  assert.deepEqual(written, [2]);
  assert.deepEqual(errors, ["s1"]);
});

// Regression: 2026-07-10 — boot-restore SELECTed the WHOLE sessions table (every
// big state jsonb) and only TTL-filtered in JS; repeated API restarts moved ~8 GB
// of Neon network transfer in one day. The TTL cutoff must pre-narrow in SQL on
// the indexed last_seen_at column (the JS check on state.lastSeenAt stays the
// authoritative wall).
test("boot-restore query pushes the TTL cutoff into SQL on last_seen_at", async () => {
  const saved = process.env.DATABASE_URL;
  // Query BUILDING only — the pool is lazy and never connects.
  process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";
  try {
    const { sql, params } = liveSessionsQuery(1234).toSQL();
    assert.match(sql, /"last_seen_at" >= \$1/);
    assert.deepEqual(params, [1234]);
  } finally {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
    await closeDb();
  }
});

test("queueSessionUpsert: a no-op without DATABASE_URL, and flush resolves", async () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    queueSessionUpsert({ id: "k1" } as unknown as Session);
    await flushSessionWrites();
    assert.ok(true);
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved;
  }
});
