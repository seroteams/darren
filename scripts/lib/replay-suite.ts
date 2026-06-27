// Shared regression-replay engine: load the frozen cases in evals/replay/,
// re-grade each against CURRENT code, and report drift from its baseline.
// Used by BOTH the CLI (scripts/replay-regression.js) and the in-app endpoint
// (backend/api/handlers/regression) so they can never disagree. No API calls.

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../backend/engine/paths.mts";
import { checkFromInputs } from "./check-session.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const REPLAY_DIR = path.join(ROOT, "evals", "replay");

function loadJson(p: string, fallback: unknown = undefined): unknown {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

interface ReplayCase {
  id: string;
  dir: string;
  input: unknown;
  expected: unknown;
}

function loadCases(only?: string): ReplayCase[] {
  const index = loadJson(path.join(REPLAY_DIR, "_index.json"), []);
  const rows = Array.isArray(index) ? index : [];
  return rows
    .map((row): ReplayCase | null => {
      const id = asString(asRecord(row).id);
      const dir = path.join(REPLAY_DIR, id);
      const input = loadJson(path.join(dir, "input.json"));
      const expected = loadJson(path.join(dir, "expected.json"));
      return input ? { id, dir, input, expected } : null;
    })
    .filter((c): c is ReplayCase => Boolean(c))
    .filter((c) => !only || c.id === only);
}

// Up to 8 changed leaf paths, "path: old -> new", for a readable diff message.
function diffValues(a: unknown, b: unknown, prefix: string, out: string[]): void {
  if (out.length >= 8) return;
  if (a === b) return;
  const objA = a && typeof a === "object";
  const objB = b && typeof b === "object";
  if (objA && objB) {
    if (Array.isArray(a) || Array.isArray(b)) {
      const arrA = Array.isArray(a) ? a : [];
      const arrB = Array.isArray(b) ? b : [];
      const len = Math.max(arrA.length, arrB.length);
      for (let i = 0; i < len; i += 1) diffValues(arrA[i], arrB[i], `${prefix}[${i}]`, out);
    } else {
      const recA = asRecord(a);
      const recB = asRecord(b);
      for (const k of new Set([...Object.keys(recA), ...Object.keys(recB)])) {
        diffValues(recA[k], recB[k], prefix ? `${prefix}.${k}` : k, out);
      }
    }
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${prefix}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
}

function sameSet(a: unknown[] = [], b: unknown[] = []): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

function runCase(c: ReplayCase) {
  const input = asRecord(c.input);
  const inputCtx = asRecord(input.ctx);
  const expected = asRecord(c.expected);
  const base = {
    id: c.id,
    kind: asString(input.kind) || "happy",
    name: asString(input.persona) || asString(inputCtx.name) || c.id,
    meetingType: asString(input.meetingType),
    issue: input.issue || null,
    dir: c.dir,
  };
  let out;
  try {
    out = checkFromInputs(c.input);
  } catch (e) {
    return { ...base, status: "error", verdict: null, expectedVerdict: expected.verdict ?? null, hardFails: [], warnings: [], reasons: [], error: e instanceof Error ? e.message : String(e) };
  }
  const { checks, briefing } = out;
  const common = { verdict: checks.verdict, hardFails: checks.hard_fails, warnings: checks.warnings, briefing };
  if (!c.expected) {
    return { ...base, ...common, status: "no-baseline", expectedVerdict: null, reasons: [] };
  }
  const reasons: string[] = [];
  if (checks.verdict !== expected.verdict) reasons.push(`verdict ${asString(expected.verdict)} → ${checks.verdict}`);
  const expHardFails = (Array.isArray(expected.hard_fails) ? expected.hard_fails : []).filter(
    (x): x is string => typeof x === "string"
  );
  if (!sameSet(checks.hard_fails, expHardFails)) {
    const added = checks.hard_fails.filter((h) => !expHardFails.includes(h));
    const gone = expHardFails.filter((h) => !checks.hard_fails.includes(h));
    if (added.length) reasons.push(`new safety failure: ${added.join(", ")}`);
    if (gone.length) reasons.push(`safety test stopped firing: ${gone.join(", ")}`);
  }
  const bdiff: string[] = [];
  diffValues(expected.briefing, briefing, "briefing", bdiff);
  reasons.push(...bdiff);
  return { ...base, ...common, status: reasons.length ? "regressed" : "ok", expectedVerdict: expected.verdict, reasons };
}

function runSuite({ only }: { only?: string } = {}) {
  const results = loadCases(only).map(runCase);
  const error = results.filter((r) => r.status === "error").length;
  const regressed = results.filter((r) => r.status === "regressed").length;
  const ok = results.filter((r) => r.status === "ok").length;
  const verdict = error ? "ERROR" : regressed ? "REGRESSED" : "OK";
  return { verdict, results, summary: { ok, regressed, error, total: results.length } };
}

// Re-freeze a case's baseline from its current output. Refuses to bless an
// adversarial safety test that is currently failing (mirrors scripts/gate.js).
// Returns "written" | "refused" | "skipped".
function updateBaseline(result: ReturnType<typeof runCase>): "written" | "refused" | "skipped" {
  if (result.status === "error") return "skipped";
  if (result.kind === "adversarial" && result.verdict !== "PASS") return "refused";
  const expected = {
    verdict: result.verdict,
    hard_fails: result.hardFails,
    warnings: result.warnings || [],
    briefing: "briefing" in result ? result.briefing : undefined,
  };
  fs.writeFileSync(path.join(result.dir, "expected.json"), `${JSON.stringify(expected, null, 2)}\n`);
  return "written";
}

export { runSuite, runCase, loadCases, updateBaseline, REPLAY_DIR };
