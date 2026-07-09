import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { persist, serialize } from "./session-persistence.ts";
import { initState } from "../engine/axes.ts";
import { createTracker } from "../engine/cost.ts";
import { TOTAL_BUDGET } from "../engine/budgets.ts";
import type { Session } from "../shared/session.types.ts";

// A minimal live Session, enough to serialize. orgId is the Phase 2 addition: it
// must survive serialize() so it lands in session-state.json on disk, where the
// run-history reads fence by it (the data wall between companies).
function fakeSession(over: Partial<Session> = {}): Session {
  return {
    id: "s1",
    dir: "/fake/s1",
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
    ...over,
  };
}

test("serialize carries orgId so the run's company lands on disk", () => {
  const out = serialize(fakeSession({ orgId: "org-A" }));
  assert.equal(out.orgId, "org-A");
});

test("serialize normalises a missing orgId to null (unfenced legacy run)", () => {
  const out = serialize(fakeSession());
  assert.equal(out.orgId, null);
});

// people-roster Phase 2: serialize() is a WHITELIST — a new Session field silently
// vanishes from session-state.json unless listed. These pin the run→person link.
test("serialize carries personId so the run's roster person lands on disk", () => {
  const out = serialize(fakeSession({ personId: "person-1" }));
  assert.equal(out.personId, "person-1");
});

test("serialize normalises a missing personId to null (old/guest runs stay unlinked)", () => {
  const out = serialize(fakeSession());
  assert.equal(out.personId, null);
});

// postgres-runtime-data P7 ("retire the files"): persist() writes session-state.json
// only when disk is the store (DB-less mode) or the dev echo is on. In live (DB mode,
// echo off) it writes nothing — Postgres holds the state. These pin that gate.
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prev[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

function inTempDir(fn: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sero-persist-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const wroteState = (dir: string): boolean => fs.existsSync(path.join(dir, "session-state.json"));

test("persist: DB mode + echo off (live) writes NO session file — Postgres is the store", () => {
  inTempDir((dir) => {
    withEnv({ DATABASE_URL: "postgres://dummy", APP_ENV: "live", RUN_FILE_ECHO: undefined }, () => {
      persist(fakeSession({ dir }));
      assert.equal(wroteState(dir), false);
    });
  });
});

test("persist: file mode (no DATABASE_URL) still writes — DB-less dev + the rollback", () => {
  inTempDir((dir) => {
    withEnv({ DATABASE_URL: undefined, APP_ENV: undefined, RUN_FILE_ECHO: undefined }, () => {
      persist(fakeSession({ dir }));
      assert.equal(wroteState(dir), true);
    });
  });
});

test("persist: DB mode + echo on (RUN_FILE_ECHO=on) writes the echo copy", () => {
  inTempDir((dir) => {
    withEnv({ DATABASE_URL: "postgres://dummy", APP_ENV: "live", RUN_FILE_ECHO: "on" }, () => {
      persist(fakeSession({ dir }));
      assert.equal(wroteState(dir), true);
    });
  });
});
