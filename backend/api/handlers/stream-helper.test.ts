import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runStage, shouldStall, abortStage } from "./stream-helper.ts";
import type { RequestContext } from "../router.ts";
import type { Session } from "../../shared/session.types.ts";

// These drive runStage with an INJECTED `produce`, so nothing here calls the
// model or the network — every test is free and deterministic.
//
// What they pin: nobody waiting on a stage is ever left un-told. A screen that
// attaches to an in-flight stage has no completion path of its own — it depends
// entirely on the driving request broadcasting to it. If that broadcast is
// skipped, or dies partway through the subscriber list, the screen waits
// forever behind a heartbeat that keeps it alive and error-free. That is the
// prep-brief hang, at its source.

interface Captured {
  event: string;
  data: Record<string, unknown>;
}

/** A fake ServerResponse that records the SSE frames written to it. */
function fakeCtx(opts: { throwOnEvent?: string } = {}) {
  const events: Captured[] = [];
  const closeHandlers: Array<() => void> = [];
  let pending: string | null = null;
  const res = {
    writableEnded: false,
    writeHead() {
      return res;
    },
    write(chunk: string) {
      const m = /^event: (.+)\n$/.exec(chunk);
      if (m) {
        if (opts.throwOnEvent && m[1] === opts.throwOnEvent) throw new Error("socket is gone");
        pending = m[1] as string;
        return true;
      }
      if (pending && chunk.startsWith("data: ")) {
        events.push({ event: pending, data: JSON.parse(chunk.slice(6)) as Record<string, unknown> });
        pending = null;
      }
      return true;
    },
    end() {
      res.writableEnded = true;
      for (const h of closeHandlers) h();
    },
    on(ev: string, fn: () => void) {
      if (ev === "close") closeHandlers.push(fn);
      return res;
    },
  };
  const c = { res } as unknown as RequestContext;
  return { c, events, seen: () => events.map((e) => e.event) };
}

function fakeSession(): Session {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sero-stream-test-"));
  return { id: "s-test", dir, inFlight: new Map(), orgId: "o1", userId: "u1" } as unknown as Session;
}

const OPTS = {
  thinkingLabel: "Choosing focus points",
  getCached: () => null,
  setCached: () => {},
  resultEvent: "result",
  buildPayload: (r: unknown) => r,
};

/** Lets the microtask queue drain so runStage reaches its `await produce`. */
const settle = () => new Promise((r) => setImmediate(r));

test("a screen that attaches mid-flight still gets the result", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const session = fakeSession();
  let release: (v: unknown) => void = () => {};
  const produce = () => new Promise((r) => { release = r; });

  const driver = fakeCtx();
  const driverDone = runStage(driver.c, session, "focus-points", { ...OPTS, produce });
  await settle();

  const attached = fakeCtx();
  await runStage(attached.c, session, "focus-points", { ...OPTS, produce });
  await settle();

  release({ focus_points: [] });
  await driverDone;
  await settle();

  assert.ok(driver.seen().includes("result"), "the driving screen got the result");
  assert.ok(attached.seen().includes("result"), "the attached screen got the result too");
});

test("a dead screen cannot starve the screens behind it", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const session = fakeSession();
  let release: (v: unknown) => void = () => {};
  const produce = () => new Promise((r) => { release = r; });

  // The driver's socket is gone — writing `result` to it throws.
  const dead = fakeCtx({ throwOnEvent: "result" });
  const driverDone = runStage(dead.c, session, "focus-points", { ...OPTS, produce });
  await settle();

  const alive = fakeCtx();
  await runStage(alive.c, session, "focus-points", { ...OPTS, produce });
  await settle();

  release({ focus_points: [] });
  await driverDone.catch(() => {});
  await settle();

  // The live screen sits BEHIND the dead one in the subscriber list. It must
  // still be told something — today the throw escapes and it hears nothing.
  const heard = alive.seen();
  assert.ok(
    heard.includes("result") || heard.includes("error"),
    `a live screen behind a dead one must still be told; it heard: [${heard.join(", ")}]`
  );
});

test("every waiting screen ends with a result or an error — never silence", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const session = fakeSession();
  const produce = () => Promise.reject(new Error("the model fell over"));

  const driver = fakeCtx();
  const driverDone = runStage(driver.c, session, "focus-points", { ...OPTS, produce });
  await driverDone.catch(() => {});
  await settle();

  const heard = driver.seen();
  assert.ok(heard.includes("error"), "a failed stage tells the screen");
  assert.ok(!heard.includes("result"), "and does not pretend it worked");
});

test("abortStage tells the waiting screens before it drops the work", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const session = fakeSession();
  const produce = () => new Promise(() => {}); // never settles — like a real in-flight run

  const driver = fakeCtx();
  runStage(driver.c, session, "focus-points", { ...OPTS, produce });
  await settle();

  const attached = fakeCtx();
  await runStage(attached.c, session, "focus-points", { ...OPTS, produce });
  await settle();

  // This is what "Suggest different topics" does: throw away the in-flight work.
  // Today it deletes + aborts WITHOUT telling anyone waiting — a guaranteed hang.
  abortStage(session, "focus-points", "regenerating");
  await settle();

  assert.ok(attached.seen().includes("error"), "the attached screen was told, not abandoned");
  assert.equal(session.inFlight.has("focus-points"), false, "and the work was dropped");
});

// --- the dev-only stall switch (Phase 1) ---

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    prev[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

test("stall switch arms only the named stage", () => {
  withEnv({ NODE_ENV: "development", SERO_STALL_STAGE: "preparation" }, () => {
    assert.equal(shouldStall("preparation"), true, "the named stage stalls");
    assert.equal(shouldStall("focus-points"), false, "other stages are untouched");
  });
});

test("stall switch is inert in production", () => {
  withEnv({ NODE_ENV: "production", SERO_STALL_STAGE: "preparation" }, () => {
    assert.equal(shouldStall("preparation"), false, "must never hang a real manager's 1:1");
  });
});

test("stall switch is off when unset", () => {
  withEnv({ NODE_ENV: "development", SERO_STALL_STAGE: undefined }, () => {
    assert.equal(shouldStall("preparation"), false);
  });
  withEnv({ NODE_ENV: "development", SERO_STALL_STAGE: "" }, () => {
    assert.equal(shouldStall("preparation"), false, "empty string is not a stage name");
  });
});
