import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionsService } from "./sessions.service.ts";
import type { SessionsRepo, RoleProfileDoc } from "./sessions.repo.ts";
import { HttpError } from "../../middleware/http-error.ts";
import { initState } from "../../../engine/axes.ts";
import { createTracker } from "../../../engine/cost.ts";
import { TOTAL_BUDGET } from "../../../engine/budgets.ts";
import { shouldReview } from "../../../engine/lexicon-reviewer.ts";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { INTRO_BUDGET } from "../../sessions.ts";
import type { Persona } from "../../persona-script.ts";
import type { Session, MeetingContext, TurnSnapshot } from "../../../shared/session.types.ts";
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
  opts: { roleProfileDoc?: RoleProfileDoc; persona?: Persona } = {}
): {
  repo: SessionsRepo;
  store: Map<string, Session>;
  created: Array<{ ctx: MeetingContext; introQueue: Question[]; orgId?: string | null; userId?: string | null }>;
  dropped: string[];
  persisted: Session[];
  logged: Array<{ dir: string; entries: unknown }>;
  coverageWrites: Array<{ dir: string; coverage: unknown }>;
  amendLogs: Array<{ dir: string; entry: unknown }>;
  notesWrites: Array<{ dir: string; markdown: string }>;
  decisionAppends: Array<{ dir: string; records: unknown[] }>;
  commits: Array<{ keepIds: string[] }>;
} {
  const store = new Map<string, Session>(seed.map((s) => [s.id, s]));
  const created: Array<{ ctx: MeetingContext; introQueue: Question[]; orgId?: string | null; userId?: string | null }> = [];
  const dropped: string[] = [];
  const persisted: Session[] = [];
  const logged: Array<{ dir: string; entries: unknown }> = [];
  const coverageWrites: Array<{ dir: string; coverage: unknown }> = [];
  const amendLogs: Array<{ dir: string; entry: unknown }> = [];
  const notesWrites: Array<{ dir: string; markdown: string }> = [];
  const decisionAppends: Array<{ dir: string; records: unknown[] }> = [];
  const commits: Array<{ keepIds: string[] }> = [];
  const repo: SessionsRepo = {
    get: (id) => store.get(id),
    create: (ctx, introQueue, orgId, userId) => {
      created.push({ ctx, introQueue, orgId, userId });
      const s = fakeSession(`new-${store.size}`);
      s.orgId = orgId ?? null;
      s.userId = userId ?? null;
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
    // S2 — the scripted-lane persona bench read:
    loadPersona: (personaId) => (opts.persona && personaId === opts.persona.id ? opts.persona : null),
    // S2b — the write side-effect seams (no disk; just record the call):
    writeScriptCoverage: (dir, coverage) => {
      coverageWrites.push({ dir, coverage });
    },
    appendAmendLog: (dir, entry) => {
      amendLogs.push({ dir, entry });
    },
    writeNotesFile: (dir, markdown) => {
      notesWrites.push({ dir, markdown });
    },
    appendLexiconDecisions: (dir, records) => {
      decisionAppends.push({ dir, records });
    },
    commitLexiconDecisions: (_session, _ctx, keepIds) => {
      commits.push({ keepIds });
      return { skipped: true, reason: "out-of-scope" };
    },
  };
  return {
    repo, store, created, dropped, persisted, logged,
    coverageWrites, amendLogs, notesWrites, decisionAppends, commits,
  };
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

test("create forwards the caller's userId to the repo (run attribution — member-nav Phase 2)", () => {
  const { repo, created } = fakeRepo();
  createSessionsService(repo).create(
    { name: "A", role: "B", seniority: "C", meetingType: "weekly", notes: "" },
    [fakeQuestion()],
    "org-A",
    "u1",
  );
  assert.equal(created[0]?.orgId, "org-A");
  assert.equal(created[0]?.userId, "u1");
});

test("require person-fences a live session: same-company members can't open each other's (member-nav Phase 2)", () => {
  const s = fakeSession("s1");
  s.orgId = "org-A";
  s.userId = "u1";
  const svc = createSessionsService(fakeRepo([s]).repo);
  // the member who created it reaches it…
  assert.equal(svc.require("s1", "org-A", "u1").id, "s1");
  // …a DIFFERENT member of the SAME company gets 404 (the person wall)…
  assert.throws(() => svc.require("s1", "org-A", "u2"), (e) => (e as { status?: number }).status === 404);
  // …a cross-company caller still 404s (the company wall, unchanged)…
  assert.throws(() => svc.require("s1", "org-B", "u1"), (e) => (e as { status?: number }).status === 404);
  // …and an internal/CLI caller (no org/user context) still resolves it.
  assert.equal(svc.require("s1", undefined, undefined).id, "s1");
});

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

// --- The live-session company wall (auth-hardening Phase 1). A session owned by a
// company can only be resolved by that company; cross-company → the same 404 as a
// missing session (don't leak that the id exists). Mirrors the runs wall.
function orgSession(id: string, orgId: string | null): Session {
  const s = fakeSession(id);
  s.orgId = orgId;
  return s;
}

test("require returns an org-owned session to its OWN company", () => {
  const { repo } = fakeRepo([orgSession("abc", "company-A")]);
  const s = createSessionsService(repo).require("abc", "company-A");
  assert.equal(s.id, "abc");
});

test("require throws 404 when ANOTHER company asks for an org-owned session", () => {
  const { repo } = fakeRepo([orgSession("abc", "company-A")]);
  const svc = createSessionsService(repo);
  assert.throws(
    () => svc.require("abc", "company-B"),
    (err: unknown) =>
      err instanceof HttpError &&
      err.status === 404 &&
      err.code === "NOT_FOUND" &&
      err.message === "Unknown session: abc" // same shape as missing — no existence leak
  );
});

test("require throws 404 when an ANONYMOUS caller asks for an org-owned session", () => {
  const { repo } = fakeRepo([orgSession("abc", "company-A")]);
  const svc = createSessionsService(repo);
  assert.throws(
    () => svc.require("abc", null),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
});

test("require DENIES a legacy (null-org) session to an org-scoped caller (default-deny)", () => {
  const { repo } = fakeRepo([orgSession("legacy", null)]);
  const svc = createSessionsService(repo);
  // The null-org escape hatch (009 Phase 1): once a caller HAS a company, an
  // unstamped/anonymous session must resolve to the same 404 as missing — never leak.
  assert.throws(
    () => svc.require("legacy", "company-B"),
    (err: unknown) => err instanceof HttpError && err.status === 404 && err.code === "NOT_FOUND"
  );
  // The anonymous caller (logged out, null) still reaches its own null-org session…
  assert.equal(svc.require("legacy", null).id, "legacy");
  // …and an internal call with no caller context (undefined) stays unfenced.
  assert.equal(svc.require("legacy").id, "legacy");
});

test("require with no caller-company arg still resolves an org-owned session (internal callers)", () => {
  const { repo } = fakeRepo([orgSession("abc", "company-A")]);
  // Omitting the arg = caller context not supplied (e.g. an internal call) → no wall.
  assert.equal(createSessionsService(repo).require("abc").id, "abc");
});

test("create forwards ctx + introQueue through the seam and returns the new session", () => {
  const { repo, created } = fakeRepo();
  const ctx: MeetingContext = { name: "Dev", role: "Eng", seniority: "Senior", meetingType: "weekly", notes: "" };
  const queue: Question[] = [];
  const out = createSessionsService(repo).create(ctx, queue);
  assert.equal(out.id, "new-0");
  assert.deepEqual(created, [{ ctx, introQueue: queue, orgId: undefined, userId: undefined }]);
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
  const s = fakeSession("abc");
  s.briefing = { headline: "done" } as unknown as Session["briefing"]; // inferStage → BRIEFING (no assembler)
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc");
  assert.deepEqual(out, { stage: "BRIEFING", supported: false });
});

test("preview assembles the FOCUS_POINTS payload for a fresh session (no API call)", () => {
  const s = fakeSession("abc"); // fresh session → inferStage = FOCUS_POINTS
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc") as {
    stage: string;
    label: string;
    model: string;
    prompt: string;
    preview: boolean;
  };
  assert.equal(out.stage, "FOCUS_POINTS");
  assert.equal(out.label, "Focus points");
  assert.equal(out.preview, true);
  assert.ok(out.model.length > 0);
  assert.ok(out.prompt.includes("weekly")); // meetingType filled in → real assembly, not a stub
});

test("preview assembles the BANK payload when focus points are ready (no API call)", () => {
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "Performance & feedback" }; // a real arc (bank stage looks it up)
  s.focusPointsResult = {
    meeting_type: "Performance & feedback",
    focus_points: [
      { id: "fp1", type: "T", category: "topic", label: "Delivery risk", reason: "r", source: "signal", confidence: "high", known: true },
    ],
  } as unknown as Session["focusPointsResult"];
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc", "bank") as {
    stage: string;
    label: string;
    model: string;
    prompt: string;
    preview: boolean;
  };
  assert.equal(out.stage, "BANK");
  assert.equal(out.label, "Question bank");
  assert.equal(out.preview, true);
  assert.ok(out.prompt.includes("Delivery risk")); // the focus point flows in → real assembly
});

test("preview throws a 409 CONFLICT for BANK when focus points aren't ready", () => {
  const s = fakeSession("abc"); // no focusPointsResult
  const { repo } = fakeRepo([s]);
  assert.throws(
    () => createSessionsService(repo).preview("abc", "bank"),
    (err: unknown) => err instanceof HttpError && err.status === 409 && err.code === "CONFLICT"
  );
});

test("preview assembles the EVAL payload when focus points are ready (no API call)", () => {
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "Performance & feedback" }; // a real arc (eval stage looks it up)
  s.focusPointsResult = {
    meeting_type: "Performance & feedback",
    focus_points: [
      { id: "fp1", type: "T", category: "topic", label: "Delivery risk", reason: "r", source: "signal", confidence: "high", known: true },
    ],
  } as unknown as Session["focusPointsResult"];
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc", "eval") as {
    stage: string;
    label: string;
    model: string;
    prompt: string;
    preview: boolean;
  };
  assert.equal(out.stage, "EVAL");
  assert.equal(out.label, "Final briefing");
  assert.equal(out.preview, true);
  assert.ok(out.prompt.includes("Delivery risk")); // focus point flows into the eval prompt
});

test("preview throws a 409 CONFLICT for EVAL when focus points aren't ready", () => {
  const s = fakeSession("abc"); // no focusPointsResult
  const { repo } = fakeRepo([s]);
  assert.throws(
    () => createSessionsService(repo).preview("abc", "eval"),
    (err: unknown) => err instanceof HttpError && err.status === 409 && err.code === "CONFLICT"
  );
});

// A session mid-questioning with a real answer pending for the planner.
function questioningSession(pending: { raw: string; text: string; skipped: boolean }): Session {
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "Performance & feedback" }; // planner looks up the arc
  s.focusPointsResult = {
    meeting_type: "Performance & feedback",
    focus_points: [
      { id: "fp1", type: "T", category: "topic", label: "Delivery risk", reason: "r", source: "signal", confidence: "high", known: true },
    ],
  } as unknown as Session["focusPointsResult"];
  s.queueRef = [fakeQuestion({ alias: "q1", name: "What slipped this sprint" }), fakeQuestion({ alias: "q2", name: "Next" })];
  s.pendingAnswer = pending;
  return s;
}

test("preview assembles the QUESTIONING (planner) payload when an answer is pending (no API call)", () => {
  const s = questioningSession({ raw: "We shipped late", text: "We shipped late because staging broke", skipped: false });
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc", "questioning") as {
    stage: string;
    label: string;
    model: string;
    prompt: string;
    preview: boolean;
  };
  assert.equal(out.stage, "QUESTIONING");
  assert.equal(out.label, "Next question");
  assert.equal(out.preview, true);
  assert.ok(out.prompt.includes("staging broke")); // the pending answer flows into the planner prompt
});

test("preview shows the honest 'planner bypassed' note when the planner would skip (no model call)", () => {
  // A skip with a non-empty queue and >1 budget triggers the planner's skip-shortcut.
  const s = questioningSession({ raw: "", text: "(skipped)", skipped: true });
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).preview("abc", "questioning") as { prompt: string };
  assert.ok(out.prompt.includes("planner bypassed")); // honest "nothing sent", not a fabricated prompt
});

test("preview throws a 409 CONFLICT for QUESTIONING when no answer is pending", () => {
  const s = fakeSession("abc");
  s.focusPointsResult = { meeting_type: "weekly", focus_points: [] } as unknown as Session["focusPointsResult"];
  s.pendingAnswer = null;
  const { repo } = fakeRepo([s]);
  assert.throws(
    () => createSessionsService(repo).preview("abc", "questioning"),
    (err: unknown) => err instanceof HttpError && err.status === 409 && err.code === "CONFLICT"
  );
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

// --- S2: start (create a session — the non-AI write that leads S2) ---
// start composes its intro queue from the real (offline, deterministic) opener +
// intro-queue config; these cases prove the SEAM forwarding (create/persist/
// loadPersona), the injected pre-warm boundary firing, the validation 400s, and
// the scripted-lane stamping — no model call, no session-state disk.

test("start rejects a missing/blank name with a 400 BAD_REQUEST", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).start({ role: "Eng", seniority: "Senior", meetingTypeIndex: 0 }),
    (err: unknown) =>
      err instanceof HttpError && err.status === 400 && err.code === "BAD_REQUEST" && err.message === "name required"
  );
});

test("start rejects a missing role / seniority with the same 400s as today", () => {
  const svc = createSessionsService(fakeRepo().repo);
  assert.throws(
    () => svc.start({ name: "Dana", seniority: "Senior", meetingTypeIndex: 0 }),
    (err: unknown) => err instanceof HttpError && err.status === 400 && err.message === "role required"
  );
  assert.throws(
    () => svc.start({ name: "Dana", role: "Eng", meetingTypeIndex: 0 }),
    (err: unknown) => err instanceof HttpError && err.status === 400 && err.message === "seniority required"
  );
});

test("start rejects an out-of-range meetingTypeIndex (negative or past the end) with a 400", () => {
  const svc = createSessionsService(fakeRepo().repo);
  const base = { name: "Dana", role: "Eng", seniority: "Senior" };
  for (const idx of [-1, MEETING_TYPES.length, 999, "nope"]) {
    assert.throws(
      () => svc.start({ ...base, meetingTypeIndex: idx }),
      (err: unknown) =>
        err instanceof HttpError && err.status === 400 && err.message === "meetingTypeIndex out of range"
    );
  }
});

test("start (manual) creates via the seam, persists, fires the pre-warm once, and returns the 201 payload", () => {
  const { repo, created, persisted } = fakeRepo();
  const fired: Array<{ id: string; ctx: MeetingContext }> = [];
  const prewarm = (session: Session, ctx: MeetingContext) => {
    fired.push({ id: session.id, ctx });
  };
  const firstType = MEETING_TYPES[0];
  assert.ok(firstType);

  const out = createSessionsService(repo, { prewarm }).start({
    name: "  Dana  ",
    role: " Engineer ",
    seniority: " Senior ",
    meetingTypeIndex: 0,
    notes: "  busy week  ",
  });

  // created through the seam with a trimmed ctx + a real (non-empty) intro queue
  assert.equal(created.length, 1);
  const call = created[0];
  assert.ok(call);
  assert.deepEqual(call.ctx, {
    name: "Dana",
    role: "Engineer",
    seniority: "Senior",
    meetingType: firstType.label,
    notes: "busy week",
  });
  assert.ok(call.introQueue.length >= 1 && call.introQueue.length <= INTRO_BUDGET);

  // persisted once; pre-warm fired once with the live session + the same ctx
  assert.equal(persisted.length, 1);
  assert.equal(fired.length, 1);
  const fire = fired[0];
  assert.ok(fire);
  assert.equal(fire.id, out.sessionId);
  assert.deepEqual(fire.ctx, call.ctx);

  // the 201 body shape mirrors the legacy handler exactly
  assert.deepEqual(out, {
    sessionId: "new-0",
    sessionDir: "/fake/new-0",
    createdAt: 0,
    introQueueLen: call.introQueue.length,
  });

  // manual lane: no persona pulled; mode/runLabel stamped on the live session
  const sess = repo.get("new-0");
  assert.ok(sess);
  assert.equal(sess.mode, "manual");
  assert.equal(sess.runLabel, null);
});

test("start stamps the caller's orgId onto the new session (the data wall, Phase 2)", () => {
  const { repo, created } = fakeRepo();
  const out = createSessionsService(repo, { prewarm: () => {} }).start(
    { name: "Dana", role: "Engineer", seniority: "Senior", meetingTypeIndex: 0 },
    "org-A",
  );
  // orgId forwarded through the seam at create time…
  assert.equal(created.length, 1);
  assert.equal(created[0]?.orgId, "org-A");
  // …and stamped on the live session.
  const sess = repo.get(out.sessionId);
  assert.ok(sess);
  assert.equal(sess.orgId, "org-A");
});

test("start without an orgId leaves the session unfenced (legacy/anonymous → null)", () => {
  const { repo, created } = fakeRepo();
  const out = createSessionsService(repo, { prewarm: () => {} }).start({
    name: "Dana", role: "Engineer", seniority: "Senior", meetingTypeIndex: 0,
  });
  assert.equal(created[0]?.orgId, undefined);
  assert.equal(repo.get(out.sessionId)?.orgId, null);
});

test("start (scripted) loads the persona through the seam and stamps the scripted lane", () => {
  const persona: Persona = {
    id: "p1",
    script: [{ alias: "q_a", name: "Q A", answer: "answer A", stage: null, axis_effects: {} }],
    script_version: "v2",
    scripted_fallback: "answer in your own words",
  };
  const { repo, persisted } = fakeRepo([], { persona });

  const out = createSessionsService(repo, { prewarm: () => {} }).start({
    name: "Dana",
    role: "Engineer",
    seniority: "Senior",
    meetingTypeIndex: 0,
    mode: "scripted",
    personaId: "p1",
    runLabel: "  bench-run  ",
  });

  const sess = repo.get(out.sessionId);
  assert.ok(sess);
  assert.equal(sess.mode, "scripted");
  assert.equal(sess.runLabel, "bench-run");
  assert.deepEqual(sess.scriptAnswers, { q_a: "answer A" });
  assert.equal(sess.scriptedFallback, "answer in your own words");
  assert.deepEqual(sess.scriptCoverage, {
    aliases_answered_by_script: [],
    aliases_missing_script: [],
    fallback_count: 0,
  });
  assert.ok(sess.fingerprint); // a run fingerprint was stamped
  assert.equal(persisted.length, 1);
});

// --- S2b: the 7 simpler non-AI writes (origin-guarded state writes) ---
// Each resolves the id through the seam (S2a writeId in the controller passes the
// resolved string), mutates session state, and forwards its write through the seam.

test("answer stages a manual answer and returns turn/skipped/truncated (no coverage write)", () => {
  const s = fakeSession("abc");
  s.queueRef = [fakeQuestion()];
  const { repo, coverageWrites } = fakeRepo([s]);
  const out = createSessionsService(repo).answer("abc", { answer: "a real reply" });
  assert.deepEqual(out, { turn: 1, skipped: false, truncated: false });
  assert.deepEqual(s.pendingAnswer, { raw: "a real reply", skipped: false, text: "a real reply" });
  assert.equal(coverageWrites.length, 0); // manual mode → no script-coverage write
});

test("answer treats blank/skip as skipped and truncates past the 4000-char cap", () => {
  const s = fakeSession("abc");
  s.queueRef = [fakeQuestion()];
  const { repo } = fakeRepo([s]);
  const svc = createSessionsService(repo);
  assert.deepEqual(svc.answer("abc", { answer: "skip" }), { turn: 1, skipped: true, truncated: false });
  assert.equal(s.pendingAnswer?.text, "(skipped)");
  const long = "x".repeat(4100);
  const out = svc.answer("abc", { answer: long });
  assert.equal(out.truncated, true);
  assert.equal(s.pendingAnswer?.raw.length, 4000);
});

test("answer in scripted mode records coverage through the seam", () => {
  const s = fakeSession("abc");
  s.mode = "scripted";
  s.queueRef = [fakeQuestion({ alias: "q_a" })];
  const { repo, coverageWrites } = fakeRepo([s]);
  createSessionsService(repo).answer("abc", { answer: "ans", answerSource: "scripted", alias: "q_a" });
  assert.equal(coverageWrites.length, 1);
  assert.equal(coverageWrites[0]?.dir, s.dir);
  assert.deepEqual(s.scriptCoverage?.aliases_answered_by_script, ["q_a"]);
});

test("answer throws 409 when no question is pending", () => {
  const s = fakeSession("abc");
  s.queueRef = []; // empty queue → nothing to answer
  const { repo } = fakeRepo([s]);
  assert.throws(
    () => createSessionsService(repo).answer("abc", { answer: "x" }),
    (err: unknown) => err instanceof HttpError && err.status === 409 && err.message === "no question pending"
  );
});

test("answer throws 404 for an unknown session", () => {
  const { repo } = fakeRepo();
  assert.throws(
    () => createSessionsService(repo).answer("ghost", { answer: "x" }),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
});

test("back reverts the last snapshot, logs the amendment through the seam, and persists", () => {
  const s = fakeSession("abc");
  const snap: TurnSnapshot = {
    appliedTurn: 3,
    turn: 2,
    totalBudget: 9,
    queueRef: [fakeQuestion({ alias: "q2" })],
    axisState: initState(),
    transcript: [],
    agendaInjected: false,
    agendaInput: null,
    question: fakeQuestion({ alias: "q1" }),
    answerText: "the original answer",
  };
  s.turnSnapshots = [snap];
  s.turn = 3;
  const { repo, amendLogs, persisted } = fakeRepo([s]);
  const out = createSessionsService(repo).back("abc");
  assert.equal(out.turn, 3); // restored turn (2) + 1
  assert.equal(out.total, 9);
  assert.equal(out.answer, "the original answer");
  assert.ok(Array.isArray(out.axes));
  assert.equal(s.turn, 2); // rolled back
  assert.equal(s.pendingAnswer, null);
  assert.equal(amendLogs.length, 1);
  assert.deepEqual(amendLogs[0]?.entry, {
    discarded_turn: 3,
    question_alias: "q1",
    original_answer: "the original answer",
  });
  assert.deepEqual(persisted, [s]);
});

test("back throws 409 when there is nothing to go back to", () => {
  const s = fakeSession("abc");
  s.turnSnapshots = [];
  const { repo } = fakeRepo([s]);
  assert.throws(
    () => createSessionsService(repo).back("abc"),
    (err: unknown) => err instanceof HttpError && err.status === 409 && err.message === "nothing to go back to"
  );
});

test("notes upserts a note, persists, and writes the notes file through the seam", () => {
  const s = fakeSession("abc");
  const { repo, persisted, notesWrites } = fakeRepo([s]);
  const out = createSessionsService(repo).notes("abc", {
    note: { id: "n1", stage: "QUESTIONING", turn: 2, text: "watch the tone here" },
  });
  assert.deepEqual(out, { ok: true, count: 1 });
  assert.equal(s.notes.length, 1);
  assert.equal(s.notes[0]?.id, "n1");
  assert.deepEqual(persisted, [s]);
  assert.equal(notesWrites.length, 1);
  assert.equal(notesWrites[0]?.dir, s.dir);
});

test("notes deletes a note when text is blank", () => {
  const s = fakeSession("abc");
  s.notes = [{ id: "n1", stage: "QUESTIONING", turn: 1, ts: 0, text: "old", question_alias: "", question_stem: "" }];
  const { repo } = fakeRepo([s]);
  const out = createSessionsService(repo).notes("abc", { note: { id: "n1", text: "  " } });
  assert.deepEqual(out, { ok: true, count: 0 });
});

test("notes validates sessionId / note / note.id with 400s before resolving the session", () => {
  const { repo } = fakeRepo();
  const svc = createSessionsService(repo);
  assert.throws(() => svc.notes("", { note: { id: "n1", text: "x" } }),
    (e: unknown) => e instanceof HttpError && e.status === 400 && e.message === "sessionId required");
  assert.throws(() => svc.notes("abc", {}),
    (e: unknown) => e instanceof HttpError && e.status === 400 && e.message === "note required");
  assert.throws(() => svc.notes("abc", { note: { text: "x" } }),
    (e: unknown) => e instanceof HttpError && e.status === 400 && e.message === "note.id required");
});

test("agendaCover records the closing-check answer and persists", () => {
  const s = fakeSession("abc");
  const { repo, persisted } = fakeRepo([s]);
  assert.deepEqual(createSessionsService(repo).agendaCover("abc", { covered: true }), { ok: true, covered: true });
  assert.equal(s.agendaCovered, true);
  assert.deepEqual(persisted, [s]);
  // any non-true value is recorded as false (mirrors `=== true`)
  assert.deepEqual(createSessionsService(repo).agendaCover("abc", { covered: "yes" }), { ok: true, covered: false });
});

test("verdict validates then stamps the structured verdict and persists", () => {
  const s = fakeSession("abc");
  const { repo, persisted } = fakeRepo([s]);
  const out = createSessionsService(repo).verdict("abc", { verdict: "fix", issue_type: "too_generic", note: " tighten " });
  assert.equal(out.ok, true);
  assert.equal(out.verdict.verdict, "fix");
  assert.equal(out.verdict.issue_type, "too_generic");
  assert.equal(out.verdict.note, "tighten");
  assert.equal(s.verdict?.verdict, "fix");
  assert.deepEqual(persisted, [s]);
});

test("verdict rejects an invalid verdict / issue_type with 400s", () => {
  const s = fakeSession("abc");
  const { repo } = fakeRepo([s]);
  const svc = createSessionsService(repo);
  assert.throws(() => svc.verdict("abc", { verdict: "nope" }),
    (e: unknown) => e instanceof HttpError && e.status === 400 && e.message === "invalid verdict");
  assert.throws(() => svc.verdict("abc", { verdict: "keep", issue_type: "bogus" }),
    (e: unknown) => e instanceof HttpError && e.status === 400 && e.message === "invalid issue_type");
});

test("selectedFocus stores the cleaned id list and persists", () => {
  const s = fakeSession("abc");
  const { repo, persisted } = fakeRepo([s]);
  const out = createSessionsService(repo).selectedFocus("abc", { focusPointIds: ["a", "", "  b  ", 0] });
  assert.deepEqual(out, { selectedFocusPoints: ["a", "b"] });
  assert.deepEqual(s.selectedFocusPoints, ["a", "b"]);
  assert.deepEqual(persisted, [s]);
});

test("lexiconDecisions logs the audit trail and commits only the kept ids when in scope", () => {
  const s = fakeSession("abc");
  s.ctx = { ...s.ctx, meetingType: "Performance & feedback" }; // a reviewable scope
  const { repo, decisionAppends, commits } = fakeRepo([s]);
  const out = createSessionsService(repo).lexiconDecisions("abc", {
    decisions: [{ id: "d1", keep: true }, { id: "d2", keep: false }],
  });
  assert.equal(out.ok, true);
  assert.equal(out.count, 2); // full audit count (keeps + drops)
  assert.equal(decisionAppends.length, 1);
  assert.equal(decisionAppends[0]?.records.length, 2);
  // commit only fires when shouldReview(ctx) is true; it gets only the kept ids
  if (commits.length) {
    assert.deepEqual(commits[0]?.keepIds, ["d1"]);
  }
});

test("lexiconDecisions requires a sessionId (400) and 404s an unknown session", () => {
  const { repo } = fakeRepo();
  const svc = createSessionsService(repo);
  assert.throws(() => svc.lexiconDecisions("", { decisions: [] }),
    (e: unknown) => e instanceof HttpError && e.status === 400 && e.message === "sessionId required");
  assert.throws(() => svc.lexiconDecisions("ghost", { decisions: [] }),
    (e: unknown) => e instanceof HttpError && e.status === 404);
});

// --- S3: AI JSON routes (the model behind an injected boundary; no model call here) ---

test("suggestAnswers returns the drafted answers from the injected boundary", async () => {
  const s = fakeSession("abc");
  s.queueRef = [fakeQuestion({ name: "What's blocking you?" })];
  const calls: unknown[] = [];
  const out = await createSessionsService(fakeRepo([s]).repo, {
    draftAnswers: async (input) => { calls.push(input); return ["a1", "a2"]; },
  }).suggestAnswers("abc");
  assert.deepEqual(out, { answers: ["a1", "a2"] });
  assert.equal(calls.length, 1);
});

test("suggestAnswers hands the boundary the session dir (scenario-pack cache lives there)", async () => {
  const s = fakeSession("abc");
  s.queueRef = [fakeQuestion({ name: "What's blocking you?" })];
  const calls: Array<{ sessionDir?: string }> = [];
  await createSessionsService(fakeRepo([s]).repo, {
    draftAnswers: async (input) => { calls.push(input); return ["a1", "a2"]; },
  }).suggestAnswers("abc");
  assert.equal(calls[0]?.sessionDir, s.dir);
});

test("suggestAnswers returns [] when no question is queued (boundary not called)", async () => {
  const s = fakeSession("abc");
  s.queueRef = [];
  let called = false;
  const out = await createSessionsService(fakeRepo([s]).repo, {
    draftAnswers: async () => { called = true; return ["x"]; },
  }).suggestAnswers("abc");
  assert.deepEqual(out, { answers: [] });
  assert.equal(called, false);
});

test("suggestAnswers degrades to [] when the boundary throws (UI shows nothing, no error)", async () => {
  const s = fakeSession("abc");
  s.queueRef = [fakeQuestion()];
  const out = await createSessionsService(fakeRepo([s]).repo, {
    draftAnswers: async () => { throw new Error("model down"); },
  }).suggestAnswers("abc");
  assert.deepEqual(out, { answers: [] });
});

test("suggestAnswers throws 404 for an unknown session", async () => {
  await assert.rejects(
    () => createSessionsService(fakeRepo().repo, {}).suggestAnswers("ghost"),
    (e: unknown) => e instanceof HttpError && e.status === 404
  );
});

const IN_SCOPE: MeetingContext = {
  name: "Dana",
  role: "Backend developer",
  seniority: "Expert",
  meetingType: "Growth & career plan",
  notes: "",
};

test("lexiconCandidates short-circuits out-of-scope without calling the boundary", async () => {
  const s = fakeSession("abc"); // default ctx (weekly) is out of lexicon-review scope
  assert.equal(shouldReview(s.ctx), false);
  let called = false;
  const out = await createSessionsService(fakeRepo([s]).repo, {
    reviewLexicon: async () => { called = true; return { skipped: false, suggestions: [] }; },
  }).lexiconCandidates("abc");
  assert.deepEqual(out, { candidates: [], skipped: "out-of-scope" });
  assert.equal(called, false);
});

test("lexiconCandidates maps the reviewer suggestions for the UI when in scope", async () => {
  const s = fakeSession("abc");
  s.ctx = { ...IN_SCOPE };
  assert.equal(shouldReview(s.ctx), true);
  const out = await createSessionsService(fakeRepo([s]).repo, {
    reviewLexicon: async () => ({
      skipped: false,
      suggestions: [{ type: "prefer_term", value: "WIP", reason: "the team says it" }],
    }),
  }).lexiconCandidates("abc");
  assert.equal(out.skipped, null);
  assert.equal(out.fromCache, false);
  assert.equal(out.candidates.length, 1);
  const c0 = out.candidates[0];
  assert.ok(c0);
  assert.equal(c0.phrase, "WIP");
  assert.equal(c0.context, "the team says it");
});

test("lexiconCandidates reports 'empty' when the reviewer returns no suggestions", async () => {
  const s = fakeSession("abc");
  s.ctx = { ...IN_SCOPE };
  const out = await createSessionsService(fakeRepo([s]).repo, {
    reviewLexicon: async () => ({ skipped: false, suggestions: [] }),
  }).lexiconCandidates("abc");
  assert.deepEqual(out, { candidates: [], skipped: "empty", fromCache: false });
});

test("lexiconCandidates passes through a skipped reviewer result", async () => {
  const s = fakeSession("abc");
  s.ctx = { ...IN_SCOPE };
  const out = await createSessionsService(fakeRepo([s]).repo, {
    reviewLexicon: async () => ({ skipped: true, reason: "reviewer-failed", error: "boom" }),
  }).lexiconCandidates("abc");
  assert.deepEqual(out, { candidates: [], skipped: "reviewer-failed", error: "boom" });
});

test("lexiconCandidates surfaces a reviewer throw as a 500", async () => {
  const s = fakeSession("abc");
  s.ctx = { ...IN_SCOPE };
  await assert.rejects(
    () => createSessionsService(fakeRepo([s]).repo, {
      reviewLexicon: async () => { throw new Error("kaboom"); },
    }).lexiconCandidates("abc"),
    (e: unknown) => e instanceof Error && "status" in e && e.status === 500
  );
});

test("lexiconCandidates requires a sessionId (400) and 404s an unknown session", async () => {
  const svc = createSessionsService(fakeRepo().repo, {});
  await assert.rejects(() => svc.lexiconCandidates(""),
    (e: unknown) => e instanceof HttpError && e.status === 400);
  await assert.rejects(() => svc.lexiconCandidates("ghost"),
    (e: unknown) => e instanceof HttpError && e.status === 404);
});
