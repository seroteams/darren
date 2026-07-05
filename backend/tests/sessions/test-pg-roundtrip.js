#!/usr/bin/env node
// Phase 005 step 3 — the Postgres round-trip proof: a session written through the
// DB store comes back from the DATABASE, identical, after it's gone from memory.
// This is the "same interface, different storage" guarantee made concrete.
//
// FREE: this touches Postgres, NOT the OpenAI API — no model calls, no cost.
// It SKIPS (passes) when DATABASE_URL is unset, so `npm test` stays green on a
// machine with no database configured (the app falls back to file storage there).

const assert = require("node:assert");
const fs = require("node:fs");
const { loadEnv } = require("../../engine/env.ts");

loadEnv(); // pull DATABASE_URL from the gitignored .env (npm test doesn't load it)

if (!process.env.DATABASE_URL) {
  console.log("SKIP test-pg-roundtrip (no DATABASE_URL — file storage in use)");
  process.exit(0);
}

const { createWebSession, dropSession, sessions } = require("../../api/sessions.ts");
const { upsertSession, readSession, deleteSession, loadSessionsFromDb } = require("../../db/sessions-store.ts");
const { closeDb } = require("../../db/client.ts");

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

(async () => {
  const session = createWebSession(ctx, introQueue);
  const id = session.id;
  const dir = session.dir;

  // Advance to mid-interview, same as the disk-resume test.
  session.focusPointsResult = { focus_points: [{ id: "x", label: "X" }] };
  session.preparationResult = { brief: { coreIssue: "…" } };
  session.bankReady = true;
  session.queueRef = [{ alias: "q_two", name: "Q two?", stage: "friction" }];
  session.transcript = [{ turn: 1, question: { alias: "q_one", name: "Q one?" }, answer: "first answer" }];
  session.turn = 1;
  session.outcomeCheck = "partly";

  try {
    // Write to Postgres, then simulate a restart: drop every trace from memory.
    await upsertSession(session);
    dropSession(id);
    check("session is gone from memory after 'restart'", () => assert.ok(!sessions.has(id)));

    // Read it back FROM THE DATABASE (not memory, not disk).
    const restored = await readSession(id);

    check("session is restored from Postgres", () => assert.ok(restored && restored.id === id));
    check("resumes at the same turn", () => assert.strictEqual(restored.turn, 1));
    check("meeting context survived", () => assert.strictEqual(restored.ctx.role, "Senior backend engineer"));
    check("transcript survived", () => {
      assert.strictEqual(restored.transcript.length, 1);
      assert.strictEqual(restored.transcript[0].answer, "first answer");
    });
    check("next question in the queue survived", () => assert.strictEqual(restored.queueRef[0].alias, "q_two"));
    check("bank-ready flag survived", () => assert.strictEqual(restored.bankReady, true));
    check("outcomeCheck survived (loop-closure capture, spec sec.6)", () => assert.strictEqual(restored.outcomeCheck, "partly"));
    check("axis state is present (jsonb survived)", () => assert.ok(restored.axisState && typeof restored.axisState === "object"));
    check("ephemeral Maps are rebuilt on restore", () => {
      assert.ok(restored.lastPlanByTurn instanceof Map);
      assert.ok(restored.inFlight instanceof Map);
    });

    // Boot-restore proof: the server's startup path repopulates the live map FROM
    // Postgres — this is what makes a session survive a real server restart.
    await loadSessionsFromDb(sessions, 60 * 60 * 1000);
    check("boot-restore loads the session from Postgres into the live map", () => {
      assert.ok(sessions.has(id));
      assert.strictEqual(sessions.get(id).turn, 1);
    });
  } finally {
    // Clean up: remove the row from the DB, the temp run folder, and close the pool.
    try { await deleteSession(id); } catch {}
    dropSession(id);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    await closeDb();
  }

  if (failed) {
    console.error(`\ntest-pg-roundtrip: ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("PASS test-pg-roundtrip");
})().catch((e) => {
  console.error("test-pg-roundtrip threw:", e && e.message ? e.message : e);
  process.exit(1);
});
