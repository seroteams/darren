import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBuildInfo } from "./build-info.ts";

const BOOTED = "2026-06-28T06:00:00.000Z";

test("computeBuildInfo: reads the short SHA + commit date from git", () => {
  const readGit = (args: string[]): string => {
    if (args[0] === "rev-parse") return "1ae7ba4";
    if (args[0] === "show") return "2026-06-28T13:22:53+07:00";
    throw new Error(`unexpected git ${args.join(" ")}`);
  };
  const info = computeBuildInfo(readGit, BOOTED);
  assert.equal(info.build, "1ae7ba4");
  assert.equal(info.committedAt, "2026-06-28T13:22:53+07:00");
  assert.equal(info.bootedAt, BOOTED);
});

test("computeBuildInfo: falls back to 'unknown' when git is unavailable", () => {
  const readGit = (): string => { throw new Error("git not found"); };
  const info = computeBuildInfo(readGit, BOOTED);
  assert.equal(info.build, "unknown");
  assert.equal(info.committedAt, null);
  assert.equal(info.bootedAt, BOOTED);
});

test("computeBuildInfo: keeps the SHA even if the commit date lookup fails", () => {
  const readGit = (args: string[]): string => {
    if (args[0] === "rev-parse") return "1ae7ba4";
    throw new Error("no date");
  };
  const info = computeBuildInfo(readGit, BOOTED);
  assert.equal(info.build, "1ae7ba4");
  assert.equal(info.committedAt, null);
});
