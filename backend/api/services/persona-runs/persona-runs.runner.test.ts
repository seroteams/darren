import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createPersonaRunner } from "./persona-runs.runner.ts";
import type { PersonaRunnerDeps } from "./persona-runs.runner.ts";
import type { RunnerHooks } from "./persona-runs.service.ts";
import { initState } from "../../../engine/axes.ts";
import { createTracker } from "../../../engine/cost.ts";
import type { Session } from "../../../shared/session.types.ts";

// The runner drives the whole scripted pipeline with every paid engine call
// injected, so these tests prove the full run shape offline — stage order,
// scripted-vs-fallback answers, run-folder files, progress — without OpenAI.

const SCRIPT = [
  { alias: "q_one", label: "q_one", name: "How are reviews going?", description: "", purpose: "scripted" as const, stage: null, axis_effects: {}, source: "scripted" as const },
  { alias: "q_two", label: "q_two", name: "What slows you down?", description: "", purpose: "scripted" as const, stage: null, axis_effects: {}, source: "scripted" as const },
];

function fakeSession(dir: string): Session {
  return {
    id: "S-TEST",
    dir,
    ctx: { name: "Maya", role: "Product Designer", seniority: "Junior", meetingType: "Performance & feedback", notes: "review loops drag" },
    mode: "scripted",
    turn: 0,
    totalBudget: 0,
    queueRef: [],
    introQueue: [],
    transcript: [],
    axisState: initState(),
    tracker: createTracker(),
    notes: [],
    scriptAnswers: { q_one: "scripted answer one" }, // q_two missing → fallback
    scriptedFallback: "the fallback answer",
    pendingAnswer: null,
    focusPointsResult: null,
    preparationResult: null,
    bankReady: false,
    briefing: null,
    sessionBank: null,
    closer: null,
    fingerprint: { mode: "scripted", personaId: "maya-chen" },
  } as unknown as Session;
}

function fakeDeps(session: Session): { deps: PersonaRunnerDeps; calls: string[]; answers: Record<string, unknown>[] } {
  const calls: string[] = [];
  const answers: Record<string, unknown>[] = [];
  const deps: PersonaRunnerDeps = {
    catalog: {
      findPersona: (id) =>
        id === "maya-chen"
          ? { id, displayName: "Maya Chen", name: "Maya", role: "Product Designer", seniority: "Junior", meetingTypeIndex: 1, notes: "review loops drag" }
          : null,
    },
    loadScript: () => SCRIPT,
    sessions: {
      start: (body, orgId) => {
        calls.push("start");
        answers.push({ start: body, orgId });
        return { sessionId: session.id };
      },
      require: () => session,
      answer: (_id, body) => {
        calls.push("answer");
        answers.push(body);
        const text = typeof body.answer === "string" ? body.answer : "";
        session.pendingAnswer = { raw: text, skipped: false, text };
      },
      persist: () => {},
    },
    engine: {
      ensureRoleProfile: async () => {
        calls.push("roleProfile");
        return null;
      },
      generateFocusPoints: async () => {
        calls.push("focus");
        return { meeting_type: "Performance & feedback", focus_points: [{ id: "f1", label: "Reviews", detail: "" }] } as never;
      },
      generatePreparation: async () => {
        calls.push("prep");
        return { brief: { openingQuestion: "Q?" }, runId: "r1" } as never;
      },
      planTurn: async () => {
        calls.push("plan");
        return {
          assessment: { deltas: { wellbeing: 1 }, note: "noted" },
          newQueue: [],
          issues: [],
          prompt: "PLAN PROMPT",
          response: { ok: true },
        };
      },
      evaluate: async () => {
        calls.push("evaluate");
        return { headline: "All fine", summary_bullets: [] } as never;
      },
    },
    now: () => 42_000,
  };
  return { deps, calls, answers };
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "persona-runner-"));
}

function noHooks(): RunnerHooks {
  return { onSession: () => {}, onProgress: () => {} };
}

test("the full run: stage order, both turns, briefing + cost + files", async () => {
  const dir = tempDir();
  const session = fakeSession(dir);
  const { deps, calls } = fakeDeps(session);

  const sessions: string[] = [];
  const progress: string[] = [];
  const out = await createPersonaRunner(deps)(
    { personaId: "maya-chen", orgId: "org-1" },
    { onSession: (id) => sessions.push(id), onProgress: (p) => { if (p.stageLabel) progress.push(p.stageLabel); } }
  );

  // Order: session first, then the pipeline in the same order the app runs it.
  assert.deepEqual(calls, ["start", "roleProfile", "focus", "prep", "answer", "plan", "answer", "plan", "evaluate"]);
  assert.deepEqual(sessions, ["S-TEST"]);
  assert.equal(out.sessionId, "S-TEST");
  assert.equal(typeof out.costUsd, "number"); // tracker total (0 with fake engine)

  // The briefing landed with cost + completedAt, like a live run.
  assert.equal(session.briefing?.headline, "All fine");
  assert.equal(session.briefing?.completedAt, 42_000);
  assert.ok(session.briefing?.cost);

  // Run-folder files a viewer reads (same names as live runs).
  assert.ok(fs.existsSync(path.join(dir, "transcript.json")));
  assert.ok(fs.existsSync(path.join(dir, "axis-state.json")));
  assert.ok(fs.existsSync(path.join(dir, "cost.json")));
  assert.ok(fs.existsSync(path.join(dir, "04-dynamic-answers", "01-turn.json")));
  assert.ok(fs.existsSync(path.join(dir, "04-dynamic-answers", "02-turn.json")));
  assert.ok(fs.existsSync(path.join(dir, "04-dynamic-answers", "01-prompt.md")));

  // Transcript carries both turns with the planner's note + deltas.
  assert.equal(session.transcript.length, 2);
  assert.equal(session.transcript[0]?.note, "noted");
  assert.deepEqual(session.transcript[0]?.realized_deltas, { wellbeing: 1 });

  // Progress told the story.
  assert.ok(progress.includes("Focus points"));
  assert.ok(progress.includes("Final briefing"));
});

test("scripted answer when the script has one, fallback when it doesn't", async () => {
  const session = fakeSession(tempDir());
  const { deps, answers } = fakeDeps(session);
  await createPersonaRunner(deps)({ personaId: "maya-chen", orgId: null }, noHooks());

  const turnAnswers = answers.filter((a) => "answerSource" in a);
  assert.deepEqual(turnAnswers, [
    { answer: "scripted answer one", alias: "q_one", answerSource: "scripted" },
    { answer: "the fallback answer", alias: "q_two", answerSource: "fallback" },
  ]);
});

test("the start body is the persona's context on the scripted lane, no user attached", async () => {
  const session = fakeSession(tempDir());
  const { deps, answers } = fakeDeps(session);
  await createPersonaRunner(deps)({ personaId: "maya-chen", orgId: "org-9" }, noHooks());

  const start = answers.find((a) => "start" in a);
  assert.deepEqual(start, {
    start: {
      name: "Maya Chen",
      role: "Product Designer",
      seniority: "Junior",
      meetingTypeIndex: 1,
      notes: "review loops drag",
      mode: "scripted",
      personaId: "maya-chen",
      runLabel: "test-engine",
    },
    orgId: "org-9",
  });
});

test("focus points already pre-warmed → no second focus call", async () => {
  const session = fakeSession(tempDir());
  session.focusPointsResult = { meeting_type: "x", focus_points: [{ id: "f1", label: "L", detail: "" }] } as never;
  const { deps, calls } = fakeDeps(session);
  await createPersonaRunner(deps)({ personaId: "maya-chen", orgId: null }, noHooks());
  assert.ok(!calls.includes("focus"));
});

test("a planner hiccup doesn't kill the run — honest '(planner failed)' note, run finishes", async () => {
  const session = fakeSession(tempDir());
  const { deps, calls } = fakeDeps(session);
  let first = true;
  deps.engine.planTurn = async () => {
    calls.push("plan");
    if (first) {
      first = false;
      throw new Error("model exploded");
    }
    return { assessment: { deltas: {}, note: "ok" }, newQueue: [], issues: [], prompt: "", response: "" };
  };

  await createPersonaRunner(deps)({ personaId: "maya-chen", orgId: null }, noHooks());
  assert.equal(session.transcript[0]?.note, "(planner failed)");
  assert.equal(session.briefing?.headline, "All fine"); // evaluation still ran
});

test("an evaluation failure rejects (the job goes failed) — nothing masked", async () => {
  const session = fakeSession(tempDir());
  const { deps } = fakeDeps(session);
  deps.engine.evaluate = async () => {
    throw new Error("eval blew up");
  };
  await assert.rejects(
    () => createPersonaRunner(deps)({ personaId: "maya-chen", orgId: null }, noHooks()),
    /eval blew up/
  );
  assert.equal(session.briefing, null);
});

test("unknown persona in the bench → throws before any engine call", async () => {
  const session = fakeSession(tempDir());
  const { deps, calls } = fakeDeps(session);
  await assert.rejects(
    () => createPersonaRunner(deps)({ personaId: "ghost", orgId: null }, noHooks()),
    /persona/
  );
  assert.deepEqual(calls, []);
});

test("a persona whose script is empty → throws instead of running a pointless paid pipeline", async () => {
  const session = fakeSession(tempDir());
  const { deps, calls } = fakeDeps(session);
  deps.loadScript = () => [];
  await assert.rejects(
    () => createPersonaRunner(deps)({ personaId: "maya-chen", orgId: null }, noHooks()),
    /script/
  );
  // start/role/focus/prep may have run, but no answers and no evaluation.
  assert.ok(!calls.includes("answer"));
  assert.ok(!calls.includes("evaluate"));
});
