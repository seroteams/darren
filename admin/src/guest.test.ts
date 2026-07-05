import { test } from "node:test";
import assert from "node:assert/strict";
import { startGuestRun } from "./guest.ts";
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
