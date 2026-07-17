import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error — sse.js is plain JS with no type declarations.
import { openSse } from "./sse.js";

// The watchdog. A stage stream that connects, says "thinking", and then goes
// silent used to leave the screen on its skeleton FOREVER — there was no timeout
// anywhere in the path. These tests pin the safety net: silence ends in an error
// the manager can retry, and a working stream is never interrupted.
//
// `thinking` deliberately does NOT clear or reset the timer: that is precisely
// what the broken server path emits before going quiet, so treating it as a sign
// of life would defeat the whole thing.

interface Listener { (e: { data?: string }): void }

class FakeEventSource {
  static last: FakeEventSource | null = null;
  url: string;
  closed = false;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }
  addEventListener(ev: string, fn: Listener) {
    const arr = this.listeners.get(ev) || [];
    arr.push(fn);
    this.listeners.set(ev, arr);
  }
  close() {
    this.closed = true;
  }
  emit(ev: string, data?: unknown) {
    for (const fn of this.listeners.get(ev) || []) {
      fn(data === undefined ? {} : { data: JSON.stringify(data) });
    }
  }
  fail() {
    // Simulate a native connection drop (EventSource fires onerror with no data).
    if (this.onerror) this.onerror();
  }
}

function useFakeEventSource() {
  FakeEventSource.last = null;
  (globalThis as Record<string, unknown>).EventSource = FakeEventSource;
}

/** Opens a stream wired the way preparation.ts wires it, and records what it saw. */
function openWatched() {
  const seen: { errors: unknown[]; results: unknown[]; nativeErrors: number } = {
    errors: [],
    results: [],
    nativeErrors: 0,
  };
  const sse = openSse("/api/v1/sessions/abc/preparation/stream")
    .on("thinking", () => {})
    .on("result", (d: unknown) => seen.results.push(d))
    .on("error", (d: unknown) => seen.errors.push(d))
    .onError(() => {
      seen.nativeErrors++;
    })
    .open();
  return { sse, seen, es: FakeEventSource.last as FakeEventSource };
}

test("stall: silence after thinking surfaces an error at 60s", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const { seen, es } = openWatched();

  // The server connects and says it's working — then goes silent. This is the bug.
  es.emit("thinking", { label: "Preparing your briefing" });

  t.mock.timers.tick(59_000);
  assert.equal(seen.errors.length, 0, "must not fire before 60s");

  t.mock.timers.tick(2_000);
  assert.equal(seen.errors.length, 1, "must fire once we pass 60s");
  assert.ok(es.closed, "the dead stream is closed");
});

test("stall: the error is honest and retryable, not a lie about the connection", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const { seen, es } = openWatched();
  es.emit("thinking", { label: "Preparing your briefing" });
  t.mock.timers.tick(61_000);

  const err = seen.errors[0] as { message?: string; timeout?: boolean };
  assert.equal(err.timeout, true, "flagged as a timeout, not a generic failure");
  assert.match(String(err.message), /longer|again/i, "tells the manager to try again");
});

test("no false alarm: a delivered result clears the watchdog for good", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const { seen, es } = openWatched();

  es.emit("thinking", { label: "Preparing your briefing" });
  es.emit("result", { brief: { coreIssue: "x" }, runId: "r1" });

  t.mock.timers.tick(120_000);
  assert.equal(seen.results.length, 1, "the brief arrived");
  assert.equal(seen.errors.length, 0, "a working brief is never interrupted");
});

test("thinking is not a sign of life: repeated thinking neither clears nor resets", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const { seen, es } = openWatched();

  es.emit("thinking", { label: "Preparing your briefing" });
  t.mock.timers.tick(30_000);
  es.emit("thinking", { label: "Preparing your briefing" }); // the broken path keeps saying this
  t.mock.timers.tick(31_000); // 61s total — would still be pending if thinking reset it

  assert.equal(seen.errors.length, 1, "60s is measured from open, not from the last thinking");
});

test("a closed stream cannot fire the watchdog", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const { sse, seen } = openWatched();

  sse.close();
  t.mock.timers.tick(120_000);

  assert.equal(seen.errors.length, 0, "no error after the consumer closed the stream");
  assert.equal(seen.nativeErrors, 0, "and no native error either");
});

test("a terminal done clears the watchdog", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const { seen, es } = openWatched();

  es.emit("thinking", { label: "Preparing your briefing" });
  es.emit("result", { brief: {}, runId: "r1" });
  es.emit("done", {});
  t.mock.timers.tick(120_000);

  assert.equal(seen.errors.length, 0, "a completed stream never stalls");
});

// Phase 3 — the one hang the watchdog can't catch. The result ARRIVES (so the
// 60s timer is cleared), but the handler that draws it onto the screen throws.
// A crash while rendering the brief must show the error card, not leave the
// manager on a half-drawn skeleton with no word and no timeout coming.

test("a crash while drawing the brief shows an error, not a silent skeleton", () => {
  useFakeEventSource();
  const seen = { errors: [] as unknown[] };
  openSse("/api/v1/sessions/abc/preparation/stream")
    .on("thinking", () => {})
    .on("result", () => {
      throw new Error("render blew up");
    })
    .on("error", (d: unknown) => seen.errors.push(d))
    .open();
  const es = FakeEventSource.last as FakeEventSource;

  es.emit("thinking", { label: "Preparing your briefing" });
  es.emit("result", { brief: {}, runId: "r1" });

  assert.equal(seen.errors.length, 1, "a render crash surfaces an error card");
  const err = seen.errors[0] as { recoverable?: boolean };
  assert.equal(err.recoverable, true, "and offers a Retry");
  assert.ok(es.closed, "and closes the dead stream");
});

test("an async render rejection is surfaced too, not swallowed", async () => {
  useFakeEventSource();
  const seen = { errors: [] as unknown[] };
  openSse("/api/v1/sessions/abc/preparation/stream")
    .on("result", async () => {
      throw new Error("async render blew up");
    })
    .on("error", (d: unknown) => seen.errors.push(d))
    .open();
  const es = FakeEventSource.last as FakeEventSource;

  es.emit("result", { brief: {}, runId: "r1" });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(seen.errors.length, 1, "a rejected async render becomes an error card");
});

// Bounded auto-recovery. A transient drop should reopen the stream — but the
// reconnect must NEVER replay a one-shot `?regenerate=1`, or a flaky connection
// would quietly rack up paid runs. That safety is the whole reason this was parked.

test("a dropped connection reconnects with the regenerate trigger stripped — never re-fires a paid run", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const seen = { errors: [] as unknown[], nativeErrors: 0 };
  openSse("/api/v1/sessions/abc/focus-points/stream?regenerate=1")
    .on("thinking", () => {})
    .on("error", (d: unknown) => seen.errors.push(d))
    .onError(() => { seen.nativeErrors++; })
    .open();
  const first = FakeEventSource.last as FakeEventSource;
  assert.match(first.url, /regenerate=1/, "first connect carries the one-shot regenerate");

  first.fail();               // the connection drops
  t.mock.timers.tick(1000);   // past the reconnect delay

  const second = FakeEventSource.last as FakeEventSource;
  assert.notEqual(second, first, "it reconnected to a fresh source");
  assert.doesNotMatch(second.url, /regenerate/, "the reconnect must NOT replay regenerate (no new paid run)");
  assert.equal(seen.errors.length, 0, "a transient drop recovers silently — no error card");
  assert.equal(seen.nativeErrors, 0, "and no premature native error");
});

test("reconnect is bounded — after repeated drops it gives up and tells the manager once", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const seen = { nativeErrors: 0 };
  openSse("/api/v1/sessions/abc/preparation/stream")
    .onError(() => { seen.nativeErrors++; })
    .open();

  for (let i = 0; i < 3; i++) {
    (FakeEventSource.last as FakeEventSource).fail();
    t.mock.timers.tick(1000);
  }

  assert.equal(seen.nativeErrors, 1, "surfaces exactly one error after exhausting retries");
});

test("a reconnected stream still delivers its result", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useFakeEventSource();
  const seen = { results: [] as unknown[], errors: [] as unknown[] };
  openSse("/api/v1/sessions/abc/preparation/stream")
    .on("result", (d: unknown) => seen.results.push(d))
    .on("error", (d: unknown) => seen.errors.push(d))
    .open();

  (FakeEventSource.last as FakeEventSource).fail();
  t.mock.timers.tick(1000);
  (FakeEventSource.last as FakeEventSource).emit("result", { brief: { coreIssue: "x" } });

  assert.equal(seen.results.length, 1, "the brief still arrives after a reconnect");
  assert.equal(seen.errors.length, 0, "and no error card");
});

test("a handler that succeeds is never turned into an error", () => {
  useFakeEventSource();
  const seen: { errors: unknown[]; results: unknown[] } = { errors: [], results: [] };
  openSse("/api/v1/sessions/abc/preparation/stream")
    .on("result", (d: unknown) => seen.results.push(d))
    .on("error", (d: unknown) => seen.errors.push(d))
    .open();
  const es = FakeEventSource.last as FakeEventSource;

  es.emit("result", { brief: { coreIssue: "x" }, runId: "r1" });

  assert.equal(seen.results.length, 1, "the brief drew fine");
  assert.equal(seen.errors.length, 0, "no phantom error from a working render");
});
