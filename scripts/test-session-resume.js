#!/usr/bin/env node
// Offline test for session continuity / resume (next-stage Phase 2). Proves a
// mid-interview web session survives a simulated server restart: persist to
// disk, drop from memory, restore from disk, and resume at the same question.
// No model calls.

const assert = require("node:assert");
const fs = require("node:fs");
const {
  createWebSession,
  dropSession,
  sessions,
  persistSession,
} = require("../backend/api/sessions.ts");
const { snapshot } = require("../backend/api/services/sessions/session-views.ts");
const { restoreFromDisk } = require("../backend/api/session-persistence.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

const ctx = { name: "Priya", role: "Senior backend engineer", seniority: "Senior", meetingType: "Bi-weekly check-in", notes: "" };
const introQueue = [
  { alias: "q_one", name: "Q one?", stage: "pulse" },
  { alias: "q_two", name: "Q two?", stage: "friction" },
];

const session = createWebSession(ctx, introQueue);
const id = session.id;
const dir = session.dir;

// Advance to mid-interview: focus + prep done, bank ready, one answered turn.
session.focusPointsResult = { focus_points: [{ id: "x", label: "X" }] };
session.selectedFocusPoints = ["x"];
session.preparationResult = { brief: { coreIssue: "…" } };
session.bankReady = true;
session.queueRef = [{ alias: "q_two", name: "Q two?", stage: "friction" }];
session.transcript = [{ turn: 1, question: { alias: "q_one", name: "Q one?" }, answer: "first answer" }];
session.turn = 1;
persistSession(session);

// Simulate a server restart: drop the in-memory session entirely.
dropSession(id);

check("session is gone from memory after 'restart'", () => assert.ok(!sessions.has(id)));

const restored = restoreFromDisk(id, sessions);

check("session is restored from disk", () => assert.ok(restored && restored.id === id));
check("resumes at the same turn", () => assert.strictEqual(restored.turn, 1));
check("transcript survived", () => {
  assert.strictEqual(restored.transcript.length, 1);
  assert.strictEqual(restored.transcript[0].answer, "first answer");
});
check("next question in the queue survived", () => assert.strictEqual(restored.queueRef[0].alias, "q_two"));
check("bank-ready flag survived", () => assert.strictEqual(restored.bankReady, true));
check("resume stage is QUESTIONING (continues from last answered question)", () =>
  assert.strictEqual(snapshot(restored).stage, "QUESTIONING"));
check("ephemeral Maps are rebuilt on restore", () => {
  assert.ok(restored.lastPlanByTurn instanceof Map);
  assert.ok(restored.inFlight instanceof Map);
});

// Cleanup the temp run folder.
dropSession(id);
try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}

if (failed) {
  console.error(`\ntest-session-resume: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("PASS test-session-resume");
