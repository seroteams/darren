#!/usr/bin/env node
// Offline test for one-step-back navigation (jun11 Phase 4). Exercises the
// deterministic restore logic in handlers/back.js — snapshot -> mutate -> back ->
// restored, plus the amend-log — with no model calls.

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const back = require("../backend/api/handlers/back.ts").default;
const { createWebSession, dropSession, summarizeAxes } = require("../backend/api/sessions.ts");

let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}: ${e.message}`);
  }
}

function mockCtx(sessionId) {
  const out = {};
  return {
    _out: out,
    readBody: async () => ({ sessionId }),
    json: (status, body) => { out.status = status; out.body = body; },
    error: (err) => { out.error = err; },
  };
}

(async () => {
  const ctx0 = { name: "Test", role: "Engineer", seniority: "Senior", meetingType: "Bi-weekly check-in", notes: "" };
  const introQueue = [
    { alias: "q_one", name: "Q one?", stage: "pulse" },
    { alias: "q_two", name: "Q two?", stage: "friction" },
  ];
  const session = createWebSession(ctx0, introQueue);

  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const originalAnswer = "my first answer";
  const preTurn = session.turn;                 // 0
  const preQueueLen = session.queueRef.length;  // 2
  const preAxes = summarizeAxes(session.axisState);
  const firstAxisId = Object.keys(session.axisState)[0];
  const preScore = session.axisState[firstAxisId].score;

  // --- Simulate one planned turn (mirrors the snapshot plan.js takes) ---
  session.turnSnapshots.push({
    appliedTurn: session.turn + 1,
    turn: session.turn,
    totalBudget: session.totalBudget,
    queueRef: clone(session.queueRef),
    axisState: clone(session.axisState),
    transcript: clone(session.transcript),
    agendaInjected: session.agendaInjected,
    agendaInput: clone(session.agendaInput),
    question: clone(session.queueRef[0]),
    answerText: originalAnswer,
  });

  // Mutate as if the turn was applied.
  const answered = session.queueRef.shift();
  session.turn += 1;
  session.transcript.push({ turn: session.turn, question: answered, answer: originalAnswer });
  session.axisState[firstAxisId].score = (preScore || 0) + 3;
  session.lastPlanByTurn.set(1, { cached: true });
  session.agendaInjected = true;

  // --- Back ---
  const ctx = mockCtx(session.id);
  await back(ctx);

  await check("restores turn + queue + transcript + agenda flag", async () => {
    assert.strictEqual(ctx._out.status, 200);
    assert.strictEqual(session.turn, preTurn, "turn reverted");
    assert.strictEqual(session.queueRef.length, preQueueLen, "queue restored");
    assert.strictEqual(session.transcript.length, 0, "transcript reverted");
    assert.strictEqual(session.agendaInjected, false, "agenda flag reverted");
    assert.ok(!session.lastPlanByTurn.has(1), "cached plan for undone turn cleared");
  });

  await check("returns original answer + turn index for re-present", async () => {
    assert.strictEqual(ctx._out.body.answer, originalAnswer);
    assert.strictEqual(ctx._out.body.turn, session.turn + 1);
  });

  await check("axes reverted to pre-turn values", async () => {
    const ax = ctx._out.body.axes.find((a) => a.id === firstAxisId);
    const pre = preAxes.find((a) => a.id === firstAxisId);
    assert.strictEqual(ax.score, pre.score, "axis score back to pre-turn");
  });

  await check("amend-log keeps the discarded answer", async () => {
    const file = path.join(session.dir, "amend-log.json");
    const log = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.strictEqual(log.length, 1);
    assert.strictEqual(log[0].original_answer, originalAnswer);
    assert.strictEqual(log[0].question_alias, "q_one");
  });

  await check("second back with no snapshot -> 409", async () => {
    const ctx2 = mockCtx(session.id);
    await back(ctx2);
    assert.ok(ctx2._out.error, "expected an error");
    assert.strictEqual(ctx2._out.error.status, 409);
  });

  // Cleanup the temp run folder.
  dropSession(session.id);
  try { fs.rmSync(session.dir, { recursive: true, force: true }); } catch {}

  if (failed) {
    console.error(`\ntest-back-nav: ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("PASS test-back-nav");
})();
