// Shared regression-replay engine: load the frozen cases in evals/replay/,
// re-grade each against CURRENT code, and report drift from its baseline.
// Used by BOTH the CLI (scripts/replay-regression.js) and the in-app endpoint
// (frontend/server/handlers/regression.js) so they can never disagree. No API calls.

const fs = require("node:fs");
const path = require("node:path");
const { checkFromInputs } = require("./check-session");

const ROOT = path.join(__dirname, "..", "..");
const REPLAY_DIR = path.join(ROOT, "evals", "replay");

function loadJson(p, fallback = undefined) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadCases(only) {
  const index = loadJson(path.join(REPLAY_DIR, "_index.json"), []);
  return index
    .map((row) => {
      const dir = path.join(REPLAY_DIR, row.id);
      const input = loadJson(path.join(dir, "input.json"));
      const expected = loadJson(path.join(dir, "expected.json"));
      return input ? { id: row.id, dir, input, expected } : null;
    })
    .filter(Boolean)
    .filter((c) => !only || c.id === only);
}

// Up to 8 changed leaf paths, "path: old -> new", for a readable diff message.
function diffValues(a, b, prefix, out) {
  if (out.length >= 8) return;
  if (a === b) return;
  const objA = a && typeof a === "object";
  const objB = b && typeof b === "object";
  if (objA && objB) {
    if (Array.isArray(a) || Array.isArray(b)) {
      const len = Math.max(a.length || 0, b.length || 0);
      for (let i = 0; i < len; i += 1) diffValues(a[i], b[i], `${prefix}[${i}]`, out);
    } else {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        diffValues(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
      }
    }
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${prefix}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
}

function sameSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

function runCase(c) {
  const base = {
    id: c.id,
    kind: c.input?.kind || "happy",
    name: c.input?.persona || c.input?.ctx?.name || c.id,
    meetingType: c.input?.meetingType || "",
    issue: c.input?.issue || null,
    dir: c.dir,
  };
  let out;
  try {
    out = checkFromInputs(c.input);
  } catch (e) {
    return { ...base, status: "error", verdict: null, expectedVerdict: c.expected?.verdict ?? null, hardFails: [], warnings: [], reasons: [], error: e.message };
  }
  const { checks, briefing } = out;
  const common = { verdict: checks.verdict, hardFails: checks.hard_fails, warnings: checks.warnings, briefing };
  if (!c.expected) {
    return { ...base, ...common, status: "no-baseline", expectedVerdict: null, reasons: [] };
  }
  const exp = c.expected;
  const reasons = [];
  if (checks.verdict !== exp.verdict) reasons.push(`verdict ${exp.verdict} → ${checks.verdict}`);
  if (!sameSet(checks.hard_fails, exp.hard_fails || [])) {
    const added = checks.hard_fails.filter((h) => !(exp.hard_fails || []).includes(h));
    const gone = (exp.hard_fails || []).filter((h) => !checks.hard_fails.includes(h));
    if (added.length) reasons.push(`new safety failure: ${added.join(", ")}`);
    if (gone.length) reasons.push(`safety test stopped firing: ${gone.join(", ")}`);
  }
  const bdiff = [];
  diffValues(exp.briefing, briefing, "briefing", bdiff);
  reasons.push(...bdiff);
  return { ...base, ...common, status: reasons.length ? "regressed" : "ok", expectedVerdict: exp.verdict, reasons };
}

function runSuite({ only } = {}) {
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
function updateBaseline(result) {
  if (result.status === "error") return "skipped";
  if (result.kind === "adversarial" && result.verdict !== "PASS") return "refused";
  const expected = {
    verdict: result.verdict,
    hard_fails: result.hardFails,
    warnings: result.warnings || [],
    briefing: result.briefing,
  };
  fs.writeFileSync(path.join(result.dir, "expected.json"), `${JSON.stringify(expected, null, 2)}\n`);
  return "written";
}

module.exports = { runSuite, runCase, loadCases, updateBaseline, REPLAY_DIR };
