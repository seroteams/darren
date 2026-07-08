import { test } from "node:test";
import assert from "node:assert/strict";
import { startGuestRun, markRunForClaim, completeClaimAfterAuth } from "./guest.ts";
import { STAGES } from "./state.js";

// The guest lane entry (guest-run Phase 2, shared by the start screen and the
// login screen): drop any remembered session id — so boot can't pull a fresh
// visitor into an old run — and land on the first intake question, no account.

test("startGuestRun: drops the remembered session and lands on intake", () => {
  const stored: Record<string, string> = { seroSessionId: "old-run" };
  (globalThis as { localStorage?: unknown }).localStorage = {
    removeItem: (k: string) => { delete stored[k]; },
  };
  let patch: unknown = null;
  try {
    startGuestRun((p) => { patch = p; });
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  assert.equal(stored.seroSessionId, undefined, "stale session id removed");
  assert.deepEqual(patch, {
    user: null,
    sessionId: null,
    stage: STAGES.INTAKE,
    substage: "NAME",
  });
});

test("startGuestRun: still works when storage is unavailable", () => {
  // No localStorage at all (blocked storage / node) — must not throw.
  let patch: { stage?: string } | null = null;
  startGuestRun((p) => { patch = p as { stage?: string }; });
  assert.equal(patch!.stage, STAGES.INTAKE);
});

// Save-at-end (guest-run Phase 3): the briefing's save card marks the finished run,
// then the login/register success paths claim it — the run becomes the new account's
// and we land straight on it. A failed claim must never dead-end a login.

function fakeStorage(seed: Record<string, string>) {
  const stored = { ...seed };
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (k in stored ? stored[k] : null),
    setItem: (k: string, v: string) => { stored[k] = v; },
    removeItem: (k: string) => { delete stored[k]; },
  };
  return stored;
}

test("markRunForClaim: remembers the finished run for after login", () => {
  const stored = fakeStorage({});
  try {
    markRunForClaim("run-7");
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  assert.equal(stored.seroClaimSessionId, "run-7");
});

test("markRunForClaim: storage blocked — must not throw", () => {
  assert.doesNotThrow(() => markRunForClaim("run-7"));
});

test("completeClaimAfterAuth: no marker — does nothing, caller lands as usual", async () => {
  fakeStorage({});
  let claimed: string | null = null;
  let patch: unknown = null;
  try {
    const handled = await completeClaimAfterAuth(
      { id: "u1" }, (p) => { patch = p; },
      async (id: string) => { claimed = id; },
    );
    assert.equal(handled, false);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  assert.equal(claimed, null, "claim endpoint never called");
  assert.equal(patch, null, "navigation left to the normal login path");
});

test("completeClaimAfterAuth: claim succeeds — markers cleared, lands on the run", async () => {
  const stored = fakeStorage({ seroClaimSessionId: "run-7", seroSessionId: "run-7" });
  let claimed: string | null = null;
  let patch: Record<string, unknown> | null = null;
  const user = { id: "u1" };
  try {
    const handled = await completeClaimAfterAuth(
      user, (p) => { patch = p as Record<string, unknown>; },
      async (id: string) => { claimed = id; },
    );
    assert.equal(handled, true);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  assert.equal(claimed, "run-7", "claimed the marked run");
  assert.equal(stored.seroClaimSessionId, undefined, "claim marker cleared");
  assert.equal(stored.seroSessionId, undefined, "boot can never resume the finished run");
  assert.deepEqual(patch, { user, stage: STAGES.RUN_DETAIL, myRunId: "run-7" });
});

test("completeClaimAfterAuth: claim fails — marker cleared, never a dead end", async () => {
  const stored = fakeStorage({ seroClaimSessionId: "run-gone" });
  let patch: unknown = null;
  try {
    const handled = await completeClaimAfterAuth(
      { id: "u1" }, (p) => { patch = p; },
      async () => { throw Object.assign(new Error("not found"), { status: 404 }); },
    );
    assert.equal(handled, false, "caller falls back to the normal per-role landing");
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
  assert.equal(stored.seroClaimSessionId, undefined, "stale marker cleared — won't retry forever");
  assert.equal(patch, null, "no navigation from the helper on failure");
});
