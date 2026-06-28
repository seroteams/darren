// Build identity for the running API process — the git short SHA + commit date,
// captured ONCE at boot and cached. A still-running stale server keeps reporting
// the SHA it booted from, so the app's build stamp goes stale until a restart —
// which is exactly the "am I testing the latest code?" check this answers. The
// SHA matches what you see on GitHub, so one id works in both places.

import { execFileSync } from "node:child_process";

export interface BuildInfo {
  build: string; // git short SHA, or "unknown" when git is unavailable
  committedAt: string | null; // ISO commit date of that SHA, or null
  bootedAt: string; // ISO time this process started
}

type GitReader = (args: string[]) => string;

const realGit: GitReader = (args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

// Pure + injectable (the git reader is a boundary) so it unit-tests with no git.
export function computeBuildInfo(readGit: GitReader, bootedAt: string): BuildInfo {
  try {
    const build = readGit(["rev-parse", "--short", "HEAD"]);
    let committedAt: string | null = null;
    try {
      committedAt = readGit(["show", "-s", "--format=%cI", "HEAD"]);
    } catch {
      committedAt = null;
    }
    return { build: build || "unknown", committedAt, bootedAt };
  } catch {
    return { build: "unknown", committedAt: null, bootedAt };
  }
}

const BOOTED_AT = new Date().toISOString();
let cached: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  if (!cached) cached = computeBuildInfo(realGit, BOOTED_AT);
  return cached;
}
