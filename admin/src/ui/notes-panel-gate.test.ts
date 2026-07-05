import { test } from "node:test";
import assert from "node:assert/strict";
import { notesPanelVisible } from "./notes-panel-gate.ts";
import { STAGES } from "../state.js";

// The notes panel (QA notes + Sending/Received/Rules tabs) is internal QA
// tooling — ONLY the internal admin role sees it, and only during a live run.
// Guests, members and managers never do (Carl, 2026-07-06).

const inRun = { sessionId: "s1", stage: STAGES.QUESTIONING };

test("a guest (no account) never sees the notes panel — even mid-run", () => {
  assert.equal(notesPanelVisible({ ...inRun, user: null }), false);
});

test("members and managers never see the notes panel", () => {
  assert.equal(notesPanelVisible({ ...inRun, user: { roles: ["member"] } }), false);
  assert.equal(notesPanelVisible({ ...inRun, user: { roles: ["manager"] } }), false);
});

test("an internal admin sees it during a live run — and only then", () => {
  const admin = { roles: ["admin"] };
  assert.equal(notesPanelVisible({ ...inRun, user: admin }), true);
  // No live session (e.g. wandering the console) — hidden.
  assert.equal(notesPanelVisible({ sessionId: null, stage: STAGES.QUESTIONING, user: admin }), false);
  // A lingering session id on a non-run page (Universe, Tasks…) — hidden.
  assert.equal(notesPanelVisible({ sessionId: "s1", stage: STAGES.TASKS, user: admin }), false);
});

test("handles the login-shape user object too (single role field)", () => {
  assert.equal(notesPanelVisible({ ...inRun, user: { role: "admin" } }), true);
  assert.equal(notesPanelVisible({ ...inRun, user: { role: "manager" } }), false);
});
