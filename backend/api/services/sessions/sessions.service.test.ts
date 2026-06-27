import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionsService } from "./sessions.service.ts";
import type { SessionsRepo, RoleProfileDoc } from "./sessions.repo.ts";
import { HttpError } from "../../middleware/http-error.ts";
import { initState } from "../../../engine/axes.ts";
import { createTracker } from "../../../engine/cost.ts";
import { TOTAL_BUDGET } from "../../../engine/budgets.ts";
import { shouldReview } from "../../../engine/lexicon-reviewer.ts";
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
function fakeRepo(
  seed: Session[] = [],
  opts: { roleProfileDoc?: RoleProfileDoc } = {}
): {
  repo: SessionsRepo;
  store: Map<string, Session>;
  created: Array<{ ctx: MeetingContext; introQueue: Question[] }>;
  dropped: string[];
  persisted: Session[];
  logged: Array<{ dir: string; entries: unknown }>;
} {
  const store = new Map<string, Session>(seed.map((s) => [s.id, s]));
  const created: Array<{ ctx: MeetingContext; introQueue: Question[] }> = [];
  const dropped: string[] = [];
  const persisted: Session[] = [];
  const logged: Array<{ dir: string; entries: unknown }> = [];
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
    // S1b extra storage reads — fakes that touch no disk:
    loadRoleProfile: () => opts.roleProfileDoc ?? null,
    appendEligibilityLog: (dir, entries) => {
      logged.push({ dir, entries });
    },
  };
  return { repo, store, created, dropped, persisted, logged };
}

// A minimal but complete Question (the 8-field closed contract). Override only
// the fields a test cares about.
function fakeQuestion(over: Partial<Question> = {}): Question {
  return {
    alias: "q_x",
    label: "Label",
    name: "A distinct question stem",
    description: "why this question exists",
    purpose: "topic",
    stage: null,
    axis_effects: {},
    source: "seed",
    ...over,
  };
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

// --- S1a: free reads (session snapshot, lexicon scope) ---

test("getSnapshot resolves through the seam and returns the session snapshot", () => {
  const s = fakeSession("abc");
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).getSnapshot("abc");
  // A fresh session (no focus points yet) reports the first stage.
  assert.equal(out.sessionId, "abc");
  assert.equal(out.stage, "FOCUS_POINTS");
});

test("getSnapshot throws a 404 for an unknown session", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).getSnapshot("ghost"),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
});

test("lexiconScope returns the session ctx's review eligibility", () => {
  const s = fakeSession("abc");
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).lexiconScope("abc");
  // Forwards exactly what the (pure) engine rule says for this session's ctx.
  assert.deepEqual(out, { eligible: shouldReview(s.ctx) });
});

test("lexiconScope throws a 404 for an unknown session", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).lexiconScope("ghost"),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
});

// --- S1b: role profile (cached terminology read) ---

test("roleProfile reports not-ready with empty lists when no profile is cached", () => {
  const s = fakeSession("abc");
  const { repo } = fakeRepo([s]); // no roleProfileDoc → seam returns null
  const out = createSessionsService(repo).roleProfile("abc");
  assert.deepEqual(out, { ready: false, terminology: [], terminologyGroups: [] });
});

test("roleProfile forwards the cached profile through the pure terminology helpers", () => {
  const s = fakeSession("abc");
  // A doc with no role_slug/seniority_key and an unsluggable ctx → no overlay
  // disk read, so effectiveTerminology stays a pure in-memory map here.
  const doc: RoleProfileDoc = {
    version: 1,
    profile: {
      summary: "",
      known_challenges: [],
      recommended_question_themes: [],
      terminology: [{ term: "WIP", meaning: "work in progress", group: "craft" }],
      terminology_groups: [{ key: "craft", label: "Craft" }],
    },
  };
  const { repo } = fakeRepo([s], { roleProfileDoc: doc });
  const out = createSessionsService(repo).roleProfile("abc");
  assert.deepEqual(out, {
    ready: true,
    terminology: [{ term: "WIP", meaning: "work in progress", group: "craft" }],
    terminologyGroups: [{ key: "craft", label: "Craft" }],
  });
});

test("roleProfile throws a 404 for an unknown session", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).roleProfile("ghost"),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
});

// --- S1b: preview (stage payload assembly gates) ---

test("preview reports supported:false for a stage with no assembler", () => {
  const s = fakeSession("abc"); // fresh session → inferStage = FOCUS_POINTS (no assembler)
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc");
  assert.deepEqual(out, { stage: "FOCUS_POINTS", supported: false });
});

test("preview throws a 409 CONFLICT when the stage's inputs aren't ready", () => {
  const s = fakeSession("abc"); // no focusPointsResult
  const { repo } = fakeRepo([s]);
  assert.throws(
    () => createSessionsService(repo).preview("abc", "preparation"),
    (err: unknown) =>
      err instanceof HttpError &&
      err.status === 409 &&
      err.code === "CONFLICT" &&
      err.message === "Focus points not ready for this stage yet"
  );
});

test("preview throws a 404 for an unknown session", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).preview("ghost"),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
});

// --- S1b: question (serve-time eligibility gate + next question) ---

test("question returns the next question and writes nothing when the head is eligible", () => {
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "" }; // unknown type → no forbidden patterns (pure, no disk)
  s.queueRef = [fakeQuestion({ alias: "q1", name: "What risk do you see ahead" })];
  const { repo, logged, persisted } = fakeRepo([s]);
  const out = createSessionsService(repo).question("abc");
  assert.deepEqual(out, {
    turn: 1,
    total: s.totalBudget,
    queueLen: 1,
    scripted: null,
    question: {
      alias: "q1",
      label: "Label",
      name: "What risk do you see ahead",
      description: "why this question exists",
      purpose: "topic",
    },
  });
  assert.equal(logged.length, 0);
  assert.equal(persisted.length, 0);
});

test("question drops an ineligible head, logs the rejection through the seam, and persists", () => {
  const dup = "How are you feeling about the project this week";
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "" };
  s.transcript = [
    { turn: 1, question: fakeQuestion({ alias: "asked", name: dup }), answer: "ok", skipped: false },
  ];
  s.queueRef = [
    fakeQuestion({ alias: "repeat", name: dup }), // duplicate of an asked question → dropped
    fakeQuestion({ alias: "good", name: "What is one decision you are stuck on" }),
  ];
  const { repo, logged, persisted } = fakeRepo([s]);
  const out = createSessionsService(repo).question("abc");
  assert.deepEqual(out, {
    turn: 1,
    total: s.totalBudget,
    queueLen: 1, // the duplicate head was dropped
    scripted: null,
    question: {
      alias: "good",
      label: "Label",
      name: "What is one decision you are stuck on",
      description: "why this question exists",
      purpose: "topic",
    },
  });
  assert.equal(logged.length, 1);
  const entry = logged[0];
  assert.ok(entry);
  assert.equal(entry.dir, s.dir);
  assert.ok(Array.isArray(entry.entries) && entry.entries.length === 1);
  assert.deepEqual(persisted, [s]);
});

test("question in scripted mode never writes (log-only) and returns the scripted head", () => {
  const dup = "How are you feeling about the project this week";
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "" };
  s.mode = "scripted";
  s.scriptAnswers = { repeat: "the scripted answer" };
  s.scriptedFallback = "ask in your own words";
  s.transcript = [
    { turn: 1, question: fakeQuestion({ alias: "asked", name: dup }), answer: "ok", skipped: false },
  ];
  s.queueRef = [fakeQuestion({ alias: "repeat", name: dup })]; // ineligible, but scripted keeps its frozen path
  const { repo, logged, persisted } = fakeRepo([s]);
  const out = createSessionsService(repo).question("abc");
  assert.deepEqual(out, {
    turn: 1,
    total: s.totalBudget,
    queueLen: 1, // scripted does not drop
    scripted: { alias: "repeat", answer: "the scripted answer", fallback: "ask in your own words" },
    question: {
      alias: "repeat",
      label: "Label",
      name: dup,
      description: "why this question exists",
      purpose: "topic",
    },
  });
  assert.equal(logged.length, 0);
  assert.equal(persisted.length, 0);
});

test("question reports done with the agenda when the queue is empty", () => {
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "" };
  s.queueRef = [];
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).question("abc");
  assert.deepEqual(out, { done: true, agenda: { summary: null, covered: null } });
});

test("question throws a 404 for an unknown session", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).question("ghost"),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
});
