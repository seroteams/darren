// Runs ONLY the free, offline checks for the Tasks board's "Run the free checks"
// button. The promise (proven in scripts/test-checks-service.js): this can never
// run anything that hits the OpenAI API — no gate/smoke/eval, no live replays.
// It does that by allow-listing two fixed commands; any other id is refused, and
// the commands are spawned as `node <script>` with a fixed argv array (no shell),
// so there is nothing to inject.

import path from "node:path";
import { spawnSync } from "node:child_process";

import { ROOT } from "../../engine/paths.mts";

/** A single allow-listed free check. `argv` is passed to `node`, script first
 *  (typed non-empty so the script path is always present). */
export interface CheckSpec {
  id: string;
  label: string;
  argv: [string, ...string[]];
}

export interface CheckResult {
  checkId: string;
  ok: boolean;
  summary: string;
  output: string;
}

/** The shape we need from a process run — `spawnSync`'s result, narrowed. */
export interface SpawnOutcome {
  status: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
}

export type SpawnFn = (file: string, args: string[]) => SpawnOutcome;

// The only commands this endpoint will ever run. Both are free and offline:
//   • run-tests.js          — the same suite as `npm test` (excludes paid tests)
//   • replay --fixtures-only — the offline replay, no model calls
const ALLOWED: Record<string, CheckSpec> = {
  tests: {
    id: "tests",
    label: "Test suite",
    argv: ["scripts/run-tests.js"],
  },
  replay: {
    id: "replay",
    label: "Offline replay",
    argv: ["scripts/replay-scenario.js", "--regression-all", "--fixtures-only"],
  },
};

function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}

/** Every free check the button is allowed to run. */
export function listChecks(): CheckSpec[] {
  return Object.values(ALLOWED);
}

/** Resolve an id to its fixed command, or refuse it (400). The safety gate. */
export function resolveCheck(id: string): CheckSpec {
  const spec = ALLOWED[id];
  if (!spec) throw httpError(400, `Unknown or non-free check: "${id}"`);
  return spec;
}

function defaultSpawn(file: string, args: string[]): SpawnOutcome {
  return spawnSync(file, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 10_000_000 });
}

// Keep only the last `max` chars — enough to show what failed without dumping a
// whole log into the browser.
function tail(text: string, max: number): string {
  const t = text.trimEnd();
  return t.length > max ? `…${t.slice(-max)}` : t;
}

function summarize(spec: CheckSpec, combined: string, ok: boolean): string {
  const passed = combined.match(/(\d+)\s*\/\s*(\d+)\s+passed/);
  if (ok) {
    return passed ? `${passed[1]}/${passed[2]} tests passed` : `${spec.label}: passed`;
  }
  const fails = combined
    .split("\n")
    .filter((l) => /^\s*(FAIL|✗|Error)/.test(l))
    .slice(0, 5)
    .join("; ");
  const count = passed ? ` (${passed[1]}/${passed[2]} passed)` : "";
  return `${spec.label}: failed${count}${fails ? ` — ${fails}` : ""}`;
}

/** Run a free check by id and report pass/fail + a short, honest summary. */
export function runFreeCheck(id: string, spawn: SpawnFn = defaultSpawn): CheckResult {
  const spec = resolveCheck(id); // refuses before anything is ever spawned
  const scriptAbs = path.join(ROOT, spec.argv[0]);
  const args = [scriptAbs, ...spec.argv.slice(1)];
  const out = spawn(process.execPath, args);
  const combined = `${out.stdout || ""}${out.stderr || ""}`;
  const ok = out.status === 0 && !out.error;
  return {
    checkId: spec.id,
    ok,
    summary: out.error ? `${spec.label}: couldn't run — ${out.error.message}` : summarize(spec, combined, ok),
    output: tail(combined, 1200),
  };
}
