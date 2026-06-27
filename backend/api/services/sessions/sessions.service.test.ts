import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionsService } from "./sessions.service.ts";
import type { SessionsRepo } from "./sessions.repo.ts";
import { HttpError } from "../../middleware/http-error.ts";
import { initState } from "../../../engine/axes.ts";
import { createTracker } from "../../../engine/cost.ts";
import { TOTAL_BUDGET } from "../../../engine/budgets.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";

// A complete-but-minimal live Session, built with the same pure engine helpers the
// real store uses (initState/createTracker) — no disk, no model. The service treats
// a Session as opaque (it only resolves + forwards it), so this is enough to prove
// the seam without fabricating engine internals.
function fakeSession(id: string): Session {
  return {
    id,
    dir: `/fake/${id}`,
    createdAt: 0,
    lastSeenAt: 0,
    completedAt: null,
    ctx: { name: "A", role: "B", seniority: "C", meetingType: "weekly", notes: "" },
    introQueue: [],
    focusPointsResult: null,
    preparationResult: null,
    bankReady: false,
    briefing: null,
    queueRef: [],
    axisState: initState(),
    transcript: [],
    turn: 0,
    totalBudget: TOTAL_BUDGET,
    closer: null,
    prepOpener: null,
    notes: [],
    agendaInput: null,
    agendaInjected: false,
    agendaCovered: null,
    turnSnapshots: [],
    pendingAnswer: null,
    lastPlanByTurn: new Map(),
    inFlight: new Map(),
    tracker: createTracker(),
  };
}

// An in-memory fake store. The whole point of S0: swap this for the file-backed
// store and the service logic is unchanged. It also records create/drop/persist so
// we can prove the service forwards writes through the seam.
function fakeRepo(seed: Session[] = []): {
  repo: SessionsRepo;
  store: Map<string, Session>;
  created: Array<{ ctx: MeetingContext; introQueue: Question[] }>;
  dropped: string[];
  persisted: Session[];
} {
  const store = new Map<string, Session>(seed.map((s) => [s.id, s]));
  const created: Array<{ ctx: MeetingContext; introQueue: Question[] }> = [];
  const dropped: string[] = [];
  const persisted: Session[] = [];
  const repo: SessionsRepo = {
    get: (id) => store.get(id),
    create: (ctx, introQueue) => {
      created.push({ ctx, introQueue });
      const s = fakeSession(`new-${store.size}`);
      store.set(s.id, s);
      return s;
    },
    drop: (id) => {
      dropped.push(id);
      store.delete(id);
    },
    persist: (session) => {
      persisted.push(session);
    },
  };
  return { repo, store, created, dropped, persisted };
}

test("get forwards the repo lookup — the session when present", () => {
  const s = fakeSession("abc");
  const { repo } = fakeRepo([s]);
  assert.equal(createSessionsService(repo).get("abc"), s);
});

test("get returns undefined when the repo has no such session", () => {
  const { repo } = fakeRepo();
  assert.equal(createSessionsService(repo).get("missing"), undefined);
});

test("require returns the session when the repo has it", () => {
  const s = fakeSession("abc");
  const { repo } = fakeRepo([s]);
  assert.equal(createSessionsService(repo).require("abc"), s);
});

test("require throws a 404 NOT_FOUND when the session is unknown", () => {
  const { repo } = fakeRepo();
  const svc = createSessionsService(repo);
  assert.throws(
    () => svc.require("ghost"),
    (err: unknown) =>
      err instanceof HttpError &&
      err.status === 404 &&
      err.code === "NOT_FOUND" &&
      err.message === "Unknown session: ghost"
  );
});

test("create forwards ctx + introQueue through the seam and returns the new session", () => {
  const { repo, created } = fakeRepo();
  const ctx: MeetingContext = { name: "Dev", role: "Eng", seniority: "Senior", meetingType: "weekly", notes: "" };
  const queue: Question[] = [];
  const out = createSessionsService(repo).create(ctx, queue);
  assert.equal(out.id, "new-0");
  assert.deepEqual(created, [{ ctx, introQueue: queue }]);
});

test("drop forwards the id through the seam", () => {
  const s = fakeSession("abc");
  const { repo, dropped, store } = fakeRepo([s]);
  createSessionsService(repo).drop("abc");
  assert.deepEqual(dropped, ["abc"]);
  assert.equal(store.has("abc"), false);
});

test("persist forwards the session through the seam", () => {
  const s = fakeSession("abc");
  const { repo, persisted } = fakeRepo([s]);
  createSessionsService(repo).persist(s);
  assert.deepEqual(persisted, [s]);
});
