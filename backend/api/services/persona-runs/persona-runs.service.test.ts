import { test } from "node:test";
import assert from "node:assert/strict";
import { createPersonaRunsService } from "./persona-runs.service.ts";
import type { PersonaRunner, PersonaRunsDeps } from "./persona-runs.service.ts";

// The service holds the job state and the guard rails; the runner is an injected
// boundary so nothing here touches the engine or OpenAI.

const BENCH = {
  "maya-chen": { id: "maya-chen", script: [{ alias: "q1" }, { alias: "q2" }] },
  "no-script": { id: "no-script", script: [] },
} as const;

function deps(overrides: Partial<PersonaRunsDeps> = {}): PersonaRunsDeps {
  return {
    loadPersona: (id) => (id && id in BENCH ? BENCH[id as keyof typeof BENCH] : null),
    hasApiKey: () => true,
    runner: async () => ({ sessionId: "S1", costUsd: 0.31 }),
    now: () => 1000,
    ...overrides,
  };
}

// A runner the test resolves/rejects by hand, so we can look at the job mid-run.
function manualRunner() {
  let resolve!: (r: { sessionId: string | null; costUsd: number | null }) => void;
  let reject!: (e: Error) => void;
  const gate = new Promise<{ sessionId: string | null; costUsd: number | null }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const runner: PersonaRunner = () => gate;
  return { runner, resolve, reject };
}

const tick = () => new Promise((r) => setImmediate(r));

test("current() is idle before any run", () => {
  const svc = createPersonaRunsService(deps());
  assert.equal(svc.current().status, "idle");
});

test("start refuses an unknown persona (404)", async () => {
  const svc = createPersonaRunsService(deps());
  await assert.rejects(() => svc.start("nobody", "org-1"), (e: { status?: number }) => e.status === 404);
  assert.equal(svc.current().status, "idle"); // nothing started
});

test("start refuses a persona without a script (400)", async () => {
  const svc = createPersonaRunsService(deps());
  await assert.rejects(() => svc.start("no-script", "org-1"), (e: { status?: number }) => e.status === 400);
});

test("start refuses when the OpenAI key is missing (409)", async () => {
  const svc = createPersonaRunsService(deps({ hasApiKey: () => false }));
  await assert.rejects(() => svc.start("maya-chen", "org-1"), (e: { status?: number }) => e.status === 409);
});

test("a second start while one is running is refused (409) — the cost backstop", async () => {
  const { runner, resolve } = manualRunner();
  const svc = createPersonaRunsService(deps({ runner }));
  await svc.start("maya-chen", "org-1");
  assert.equal(svc.current().status, "running");
  await assert.rejects(() => svc.start("maya-chen", "org-1"), (e: { status?: number }) => e.status === 409);
  resolve({ sessionId: "S1", costUsd: null });
  await tick();
});

test("the happy path: running → done with sessionId + cost, timestamps stamped", async () => {
  const { runner, resolve } = manualRunner();
  const svc = createPersonaRunsService(deps({ runner, now: () => 1234 }));
  const out = await svc.start("maya-chen", "org-1");
  assert.deepEqual(out, { personaId: "maya-chen" });

  const running = svc.current();
  assert.equal(running.status, "running");
  assert.equal(running.personaId, "maya-chen");
  assert.equal(running.startedAt, 1234);
  assert.equal(running.error, null);

  resolve({ sessionId: "S9", costUsd: 0.34 });
  await tick();

  const done = svc.current();
  assert.equal(done.status, "done");
  assert.equal(done.sessionId, "S9");
  assert.equal(done.costUsd, 0.34);
  assert.equal(done.finishedAt, 1234);
});

test("progress and the session id show up in current() while running", async () => {
  const { runner: gateRunner, resolve } = manualRunner();
  let hooks!: Parameters<PersonaRunner>[1];
  const runner: PersonaRunner = (input, h) => {
    hooks = h;
    return gateRunner(input, h);
  };
  const svc = createPersonaRunsService(deps({ runner }));
  await svc.start("maya-chen", "org-1");

  hooks.onSession("S5");
  hooks.onProgress({ stageLabel: "Question", turn: 2, total: 7 });
  const job = svc.current();
  assert.equal(job.sessionId, "S5");
  assert.equal(job.stageLabel, "Question");
  assert.equal(job.turn, 2);
  assert.equal(job.total, 7);

  resolve({ sessionId: "S5", costUsd: null });
  await tick();
});

test("a runner failure lands in failed with the reason, and frees the slot", async () => {
  const { runner, reject } = manualRunner();
  const svc = createPersonaRunsService(deps({ runner }));
  await svc.start("maya-chen", "org-1");
  reject(new Error("model exploded"));
  await tick();

  const job = svc.current();
  assert.equal(job.status, "failed");
  assert.equal(job.error, "model exploded");

  // the slot is free again — a new start is accepted
  const ok = createPersonaRunsService(deps()); // sanity: fresh service also idle
  assert.equal(ok.current().status, "idle");
  await svc.start("maya-chen", "org-1"); // no throw = accepted
});

test("the runner gets the persona id and the caller's company", async () => {
  let seen: unknown = null;
  const runner: PersonaRunner = async (input) => {
    seen = input;
    return { sessionId: null, costUsd: null };
  };
  const svc = createPersonaRunsService(deps({ runner }));
  await svc.start("maya-chen", "org-77");
  await tick();
  assert.deepEqual(seen, { personaId: "maya-chen", orgId: "org-77" });
});
