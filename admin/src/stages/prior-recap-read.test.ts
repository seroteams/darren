import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPriorRecap, RECAP_TIMEOUT_MS } from "./prior-recap-read.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The glance sits on the path that paints the walk-in card. Anything it does
// wrong leaves a manager staring at an empty screen with a meeting to run, so
// every failure mode here has to end at "no glance", never at a hang or a throw.

test("a session with no id asks nothing and answers nothing", async () => {
  assert.equal(await loadPriorRecap(""), null);
  assert.equal(await loadPriorRecap(undefined as never), null);
});

test("a hung server does not hold the walk-in card", async () => {
  const original = globalThis.fetch;
  // Never settles: the shape of a server that has accepted the connection and
  // then gone quiet, which is exactly what a plain await would wait forever on.
  globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
  try {
    const started = Date.now();
    assert.equal(await loadPriorRecap("s1", 30), null);
    assert.ok(Date.now() - started < 2000, "it gave up rather than waiting");
  } finally {
    globalThis.fetch = original;
  }
});

test("a failed read is not an error the manager meets", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await loadPriorRecap("s1"), null);
  } finally {
    globalThis.fetch = original;
    console.warn = warn;
  }
});

test("a refusal reads as no glance, not as a broken one", async () => {
  const original = globalThis.fetch;
  const reply = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
  try {
    globalThis.fetch = (() => reply({ prior: null })) as typeof fetch;
    assert.equal(await loadPriorRecap("s1"), null, "the server's honest 'nothing here'");
    globalThis.fetch = (() => reply({})) as typeof fetch;
    assert.equal(await loadPriorRecap("s1"), null, "a payload missing the key entirely");
    globalThis.fetch = (() => reply({ prior: { headline: "x" } })) as typeof fetch;
    assert.deepEqual(await loadPriorRecap("s1"), { headline: "x" }, "and a real one comes through");
  } finally {
    globalThis.fetch = original;
  }
});

test("the timeout is short enough to be invisible on the walk-in card", () => {
  assert.ok(RECAP_TIMEOUT_MS > 0 && RECAP_TIMEOUT_MS <= 3000, "seconds, not tens of seconds");
});

// Past the gate there is no glance to show, so the request is not worth making:
// the server refuses a session that already has a transcript anyway.
test("the runner only asks while the gate is actually going up", () => {
  const HOST = fs.readFileSync(path.join(HERE, "questioning.js"), "utf8");
  assert.match(HOST, /gateSeen \? Promise\.resolve\(null\) : loadPriorRecap\(/, "seen gate, no request");
});
