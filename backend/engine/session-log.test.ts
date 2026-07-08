// logTurn / logRunRoot — the per-turn + run-root half of the write funnel
// (postgres-runtime-data Phase 3; logStage's Phase-2 pattern). Disk side only:
// echo ON writes the same files the lanes used to write by hand; echo OFF
// touches nothing. The DB side is covered by the pg parity/roundtrip tests.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logTurn, logRunRoot } from "./session.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const saved = new Map<string, string | undefined>();
  for (const k of Object.keys(vars)) {
    saved.set(k, process.env[k]);
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function scratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sero-session-log-"));
}

test("logTurn with echo on writes NN-turn.json + prompt/response into 04-dynamic-answers", () => {
  const dir = scratchDir();
  const session = { id: "2026_Jul08_00-00-deadbeef", dir };
  withEnv({ RUN_FILE_ECHO: "on", DATABASE_URL: undefined }, () => {
    logTurn(session, 3, { turn: 3, answer: "hi" }, { prompt: "PROMPT", response: { ok: true } });
  });
  const turnsDir = path.join(dir, "04-dynamic-answers");
  const turn = JSON.parse(fs.readFileSync(path.join(turnsDir, "03-turn.json"), "utf8"));
  assert.equal(turn.answer, "hi");
  assert.equal(fs.readFileSync(path.join(turnsDir, "03-prompt.md"), "utf8"), "PROMPT");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(turnsDir, "03-response.json"), "utf8")), { ok: true });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("logTurn without a prompt writes only the turn file", () => {
  const dir = scratchDir();
  withEnv({ RUN_FILE_ECHO: "on", DATABASE_URL: undefined }, () => {
    logTurn({ id: "k", dir }, 1, { turn: 1 });
  });
  const turnsDir = path.join(dir, "04-dynamic-answers");
  assert.ok(fs.existsSync(path.join(turnsDir, "01-turn.json")));
  assert.ok(!fs.existsSync(path.join(turnsDir, "01-prompt.md")));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("logRunRoot with echo on writes the root json file", () => {
  const dir = scratchDir();
  withEnv({ RUN_FILE_ECHO: "on", DATABASE_URL: undefined }, () => {
    logRunRoot({ id: "k", dir }, "transcript.json", [{ turn: 1 }]);
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "transcript.json"), "utf8")), [{ turn: 1 }]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("echo off: logTurn + logRunRoot leave the filesystem untouched", () => {
  const dir = path.join(os.tmpdir(), "sero-session-log-never-" + process.pid);
  withEnv({ RUN_FILE_ECHO: "off", DATABASE_URL: undefined }, () => {
    logTurn({ id: "k", dir }, 2, { turn: 2 }, { prompt: "P", response: "R" });
    logRunRoot({ id: "k", dir }, "cost.json", { total: 0 });
  });
  assert.ok(!fs.existsSync(dir), "echo off must not create the run dir");
});
