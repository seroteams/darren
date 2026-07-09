// postgres-runtime-data P7 ("retire the files"): the file-repo's log-only run-dir
// writers skip disk in live (DB mode, echo off) so a full 1:1 leaves zero new files;
// DB-less dev and echo-on still write them for the local tooling. writeNotesFile
// stands in for all five writers — they share the same skipDiskLog() gate.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileSessionsRepo } from "./sessions.repo.ts";

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sero-repo-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const wroteNotes = (dir: string): boolean => fs.existsSync(path.join(dir, "notes.md"));

test("writeNotesFile: DB mode + echo off (live) writes no run-dir file", () => {
  inTempDir((dir) => {
    withEnv({ DATABASE_URL: "postgres://dummy", APP_ENV: "live", RUN_FILE_ECHO: undefined }, () => {
      fileSessionsRepo.writeNotesFile(dir, "# notes\n");
      assert.equal(wroteNotes(dir), false);
    });
  });
});

test("writeNotesFile: file mode (no DATABASE_URL) writes the render for local tooling", () => {
  inTempDir((dir) => {
    withEnv({ DATABASE_URL: undefined, APP_ENV: undefined, RUN_FILE_ECHO: undefined }, () => {
      fileSessionsRepo.writeNotesFile(dir, "# notes\n");
      assert.equal(wroteNotes(dir), true);
    });
  });
});

test("writeNotesFile: DB mode + echo on (RUN_FILE_ECHO=on) keeps the local echo", () => {
  inTempDir((dir) => {
    withEnv({ DATABASE_URL: "postgres://dummy", APP_ENV: "live", RUN_FILE_ECHO: "on" }, () => {
      fileSessionsRepo.writeNotesFile(dir, "# notes\n");
      assert.equal(wroteNotes(dir), true);
    });
  });
});
