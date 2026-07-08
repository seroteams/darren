#!/usr/bin/env node
// postgres-runtime-data Phase 3 — the read-cutover parity proof: one run seeded
// through the REAL write path (createWebSession + logStage + logTurn + logRunRoot
// + upsertSession), then every RunsRepo read answered by BOTH stores and
// deep-equalled. Any row-shape drift that would break the admin UI fails here,
// not on Carl's screen.
//
// FREE: touches Postgres, never the OpenAI API. SKIPS (passes) when DATABASE_URL
// is unset, so `npm test` stays green on a machine with no database configured.

const assert = require("node:assert");
const fs = require("node:fs");
const { loadEnv } = require("../../engine/env.ts");

loadEnv(); // pull DATABASE_URL from the gitignored .env (npm test doesn't load it)

if (!process.env.DATABASE_URL) {
  console.log("SKIP test-pg-runs-parity (no DATABASE_URL — file storage in use)");
  process.exit(0);
}

const { createWebSession, dropSession } = require("../../api/sessions.ts");
const { persist } = require("../../api/session-persistence.ts");
const { logStage, logTurn, logRunRoot } = require("../../engine/session.ts");
const { upsertSession } = require("../../db/sessions-store.ts");
const { flushArtifactWrites } = require("../../db/run-artifacts-store.ts");
const { fileRunsRepo, pgRunsRepo } = require("../../api/services/runs/runs.repo.ts");
const { pgDeleteRun, pgListFinishedRunsForUser, pgSuperadminRunView } = require("../../db/runs-store.ts");
const { listFinishedRunsForUser, superadminRunView } = require("../../engine/run-history.ts");
const { closeDb } = require("../../db/client.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

// Find our run's row in a list answer (both stores list every run they know).
function rowFor(list, id) {
  return list.find((r) => r && r.id === id) ?? null;
}

const USER_ID = "7f000000-0000-4000-8000-00000000c0de"; // no FK on sessions.user_id
const ctx = { name: "Parity Priya", role: "Senior backend engineer", seniority: "Senior", meetingType: "Bi-weekly check-in", notes: "" };
const introQueue = [
  { alias: "q_one", name: "Q one?", stage: "pulse" },
  { alias: "q_two", name: "Q two?", stage: "friction" },
];

(async () => {
  process.env.RUN_FILE_ECHO = "on"; // parity needs both stores populated

  const session = createWebSession(ctx, introQueue);
  const id = session.id;

  // Finish the run through the real funnel: stage artifacts, one Q&A turn,
  // run-root files, then the completed state into both stores.
  session.userId = USER_ID;
  session.transcript = [
    { turn: 1, question: { alias: "q_one", name: "Q one?" }, answer: "first answer", skipped: false, note: null },
  ];
  session.turn = 1;
  session.notes = [{ text: "parity note", at: 1 }];
  session.briefing = { summary: "done", cost: { usd_total: 0 } };
  session.completedAt = Date.now();

  logStage(session, "01-focus-points", { inputs: { ctx }, prompt: "FOCUS PROMPT", response: { focus_points: [{ id: "fp1", label: "Load" }] } });
  logStage(session, "05-evaluation", { inputs: { t: 1 }, prompt: "EVAL PROMPT", response: "{\"raw\":true}", final: { shipped: true } });
  logTurn(session, 1, { turn: 1, question: introQueue[0], answer: "first answer", skipped: false, assessment: { deltas: {}, note: "" }, new_queue: [], issues: [], unbooked_signal: [], axis_state: {} }, { prompt: "TURN PROMPT", response: { new_queue: [] } });
  logRunRoot(session, "transcript.json", session.transcript);
  logRunRoot(session, "axis-state.json", {});
  logRunRoot(session, "cost.json", { usd_total: 0 });
  persist(session);
  await upsertSession(session);
  await flushArtifactWrites();

  // Sidecar writes go through the pg repo (column + file echo) so both stores agree.
  await pgRunsRepo.writeRating(id, null, { version: 1, runId: id, stars: 4, note: "useful", ratedBy: USER_ID, createdAt: "2026-07-08T00:00:00.000Z", updatedAt: "2026-07-08T00:00:00.000Z" });
  await pgRunsRepo.writeReview(id, null, { version: 1, runId: id, reviewer: "carl", marks: { role_aware: "pass" }, overall: "keep", note: "", createdAt: "2026-07-08T00:00:00.000Z", updatedAt: "2026-07-08T00:00:00.000Z" });
  await pgRunsRepo.setArchived(id, false, null);

  try {
    const [fileFinished, pgFinished] = [await fileRunsRepo.listFinished(null), await pgRunsRepo.listFinished(null)];
    check("listFinished row matches", () => assert.deepStrictEqual(rowFor(pgFinished, id), rowFor(fileFinished, id)));

    const [fileSummary, pgSummary] = [await fileRunsRepo.summarize(id, null), await pgRunsRepo.summarize(id, null)];
    check("summarize matches", () => assert.deepStrictEqual(pgSummary, fileSummary));

    const [fileCompare, pgCompare] = [await fileRunsRepo.compare(id, null), await pgRunsRepo.compare(id, null)];
    check("compare matches", () => assert.deepStrictEqual(pgCompare, fileCompare));

    const [fileStages, pgStages] = [await fileRunsRepo.readStages(id, null), await pgRunsRepo.readStages(id, null)];
    check("readStages matches (incl. per-turn prompt/raw)", () => assert.deepStrictEqual(pgStages, fileStages));

    const [fileMember, pgMember] = [await fileRunsRepo.memberRun(id, null, USER_ID), await pgRunsRepo.memberRun(id, null, USER_ID)];
    check("memberRun view matches", () => assert.deepStrictEqual(pgMember, fileMember));

    const [fileMine, pgMine] = [await fileRunsRepo.listFinishedForMember(null, USER_ID), await pgRunsRepo.listFinishedForMember(null, USER_ID)];
    check("listFinishedForMember row matches", () => assert.deepStrictEqual(rowFor(pgMine, id), rowFor(fileMine, id)));

    const [fileUserRuns, pgUserRuns] = [listFinishedRunsForUser(USER_ID), await pgListFinishedRunsForUser(USER_ID)];
    check("superadmin drilldown row matches", () => assert.deepStrictEqual(rowFor(pgUserRuns, id), rowFor(fileUserRuns, id)));

    const [fileView, pgView] = [superadminRunView(id), await pgSuperadminRunView(id)];
    check("superadmin run view matches", () => assert.deepStrictEqual(pgView, fileView));

    const [fileRecent, pgRecent] = [await fileRunsRepo.listRecent(50, null), await pgRunsRepo.listRecent(50, null)];
    check("listRecent row matches (incl. pipelineDigest from the lock)", () =>
      assert.deepStrictEqual(rowFor(pgRecent, id), rowFor(fileRecent, id)));

    const [fileRating, pgRating] = [await fileRunsRepo.readRating(id, null), await pgRunsRepo.readRating(id, null)];
    check("rating sidecar matches column", () => assert.deepStrictEqual(pgRating, fileRating));

    const [fileReview, pgReview] = [await fileRunsRepo.readReview(id, null), await pgRunsRepo.readReview(id, null)];
    check("review sidecar matches column", () => assert.deepStrictEqual(pgReview, fileReview));
  } finally {
    // Clean up: DB rows + the echo dir, and the in-memory session.
    const del = await pgDeleteRun(id, null);
    check("cleanup deletes DB rows + echo dir", () => {
      assert.strictEqual(del.deleted, true);
      assert.strictEqual(fs.existsSync(session.dir), false);
    });
    dropSession(id);
    await closeDb();
  }

  if (failed > 0) {
    console.error(`test-pg-runs-parity: ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("test-pg-runs-parity: all checks passed");
})().catch(async (e) => {
  console.error("test-pg-runs-parity crashed:", e);
  try { await closeDb(); } catch {}
  process.exit(1);
});
