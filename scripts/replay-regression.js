#!/usr/bin/env node
// Offline regression replay.
//
// Re-grades every frozen run in evals/replay/ against the CURRENT code and flags
// any drift from its saved baseline. No API calls, $0. This is the deterministic
// half of the trust gate (scripts/gate.js) decoupled from the live, paid half.
//
//   npm run replay                          all cases
//   node scripts/replay-regression.js --only <id>
//   node scripts/replay-regression.js --update-baseline   re-freeze baselines
//   node scripts/replay-regression.js --json
//
// Drift in EITHER direction counts (so a safety test that quietly stops firing is
// caught too — stricter than the live gate). Exit: 0 all good · 1 regression · 2 infra.

const fs = require("node:fs");
const path = require("node:path");
const { checkFromInputs } = require("./lib/check-session");

const ROOT = path.join(__dirname, "..");
const REPLAY_DIR = path.join(ROOT, "evals", "replay");

function loadJson(p, fallback = undefined) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseArgs(argv) {
  const args = { only: "", updateBaseline: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--only") args.only = String(argv[i + 1] || "").trim();
    if (argv[i] === "--update-baseline") args.updateBaseline = true;
    if (argv[i] === "--json") args.json = true;
  }
  return args;
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
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.push(`${prefix}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
}

function sameSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

function runOne(c) {
  let actual;
  try {
    actual = checkFromInputs(c.input);
  } catch (e) {
    return { ...c, status: "error", error: e.message };
  }
  const exp = c.expected || {};
  const checks = actual.checks;
  const reasons = [];

  if (!c.expected) {
    return { ...c, checks, briefing: actual.briefing, status: "no-baseline" };
  }
  if (checks.verdict !== exp.verdict) reasons.push(`verdict ${exp.verdict} → ${checks.verdict}`);
  if (!sameSet(checks.hard_fails, exp.hard_fails || [])) {
    const added = checks.hard_fails.filter((h) => !(exp.hard_fails || []).includes(h));
    const gone = (exp.hard_fails || []).filter((h) => !checks.hard_fails.includes(h));
    if (added.length) reasons.push(`new hard fail: ${added.join(", ")}`);
    if (gone.length) reasons.push(`safety test stopped firing: ${gone.join(", ")}`);
  }
  const bdiff = [];
  diffValues(exp.briefing, actual.briefing, "briefing", bdiff);
  reasons.push(...bdiff);

  return { ...c, checks, briefing: actual.briefing, status: reasons.length ? "regressed" : "ok", reasons };
}

function updateBaseline(result) {
  // Never bless an adversarial safety test that is currently failing — that's a
  // real leak/over-diagnosis to fix, not a baseline to accept (mirrors gate.js).
  if (result.input.kind === "adversarial" && result.checks.verdict !== "PASS") {
    console.warn(`  refusing to baseline ${result.id}: safety test is failing (${result.checks.hard_fails.join(", ")}) — fix it, don't baseline it.`);
    return false;
  }
  const expected = {
    verdict: result.checks.verdict,
    hard_fails: result.checks.hard_fails,
    warnings: result.checks.warnings,
    briefing: result.briefing,
  };
  fs.writeFileSync(path.join(result.dir, "expected.json"), `${JSON.stringify(expected, null, 2)}\n`);
  console.log(`  baselined ${result.id} → ${result.checks.verdict}`);
  return true;
}

function label(c) {
  const name = c.input?.ctx?.name || c.id;
  const mt = c.input?.meetingType || "";
  const tag = c.input?.kind === "adversarial" ? "  [safety test]" : "";
  return `${name} — ${mt}${tag}`;
}

function printTable(results) {
  console.log("");
  for (const r of results) {
    if (r.status === "error") {
      console.log(`  ✗ ERROR      ${label(r)}\n      ${r.error}`);
      continue;
    }
    if (r.status === "no-baseline") {
      console.log(`  ? NEW        ${label(r)}  (no baseline yet — run --update-baseline)`);
      continue;
    }
    const mark = r.status === "regressed" ? "✗ needs a look" : "✓ still good ";
    console.log(`  ${mark}  ${label(r)}   ${r.checks.verdict}`);
    for (const reason of r.reasons || []) console.log(`        ${reason}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = loadCases(args.only);
  if (!cases.length) {
    console.error(args.only ? `No saved case "${args.only}" in evals/replay/.` : "No saved cases in evals/replay/_index.json.");
    process.exit(2);
  }

  console.log(`\nRegression replay — ${cases.length} case(s)  ·  offline, no AI`);
  const results = cases.map(runOne);
  printTable(results);

  if (args.updateBaseline) {
    console.log("\nUpdating baselines:");
    results.forEach((r) => r.status !== "error" && updateBaseline(r));
  }

  const errored = results.filter((r) => r.status === "error").length;
  const regressed = results.filter((r) => r.status === "regressed").length;
  const ok = results.filter((r) => r.status === "ok").length;
  const verdict = errored ? "ERROR" : regressed ? "REGRESSED" : "OK";

  if (args.json) {
    console.log(JSON.stringify({ verdict, results: results.map((r) => ({ id: r.id, status: r.status, verdict: r.checks?.verdict, reasons: r.reasons })) }, null, 2));
  }
  console.log(`\n  ${verdict}  (${ok} still good / ${regressed} needs a look${errored ? ` / ${errored} error` : ""})  ·  $0, no AI\n`);

  process.exit(errored ? 2 : regressed ? 1 : 0);
}

main();
