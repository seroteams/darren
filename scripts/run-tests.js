#!/usr/bin/env node
// Offline test runner: runs every assertion script that doesn't need an API key,
// in its own process (so a test's process.exit doesn't kill the runner), and
// fails with a non-zero exit code if any of them fail.
//
// API-dependent checks (smoke, sweep, eval batches, test-prep-role-diff) are NOT
// run here — they cost money and need live keys. Run those manually.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const SCRIPTS_DIR = __dirname;
const ROOT = path.join(__dirname, "..");

// Every scripts/test-*.js is an offline assertion script and is auto-discovered
// here — a new test file can never be silently skipped. The ONLY exceptions are
// the paid ones below (they hit the OpenAI API — run those manually, with a
// go-ahead).
const PAID_TESTS = new Set(["test-prep-role-diff.js"]);
const OFFLINE_TESTS = fs
  .readdirSync(SCRIPTS_DIR)
  .filter((n) => n.startsWith("test-") && n.endsWith(".js") && !PAID_TESTS.has(n))
  .sort();

// The mirrored test tree (Phase 004 step 4):
//   - Unit tests live BESIDE the code as `*.test.ts` (backend-conventions). They use
//     the built-in `node:test` runner, so each runs via `node --test <file>`.
//   - Integration/e2e tests live under backend/tests/<domain>/ as `test-*.js`,
//     shaped like the API service domains (e.g. backend/tests/sessions/). They are
//     standalone assertion scripts, run via `node <file>` like the offline scripts.
// Both are auto-discovered below, so a new test just drops into the right folder.
function findTests(dir, predicate) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findTests(full, predicate));
    else if (predicate(entry.name)) out.push(full);
  }
  return out;
}

// `*.test.ts` everywhere under backend/ EXCEPT the integration tree (those are .js),
// plus co-located admin unit tests (pure logic only — node has no DOM).
const COLOCATED_TESTS = [
  ...findTests(path.join(ROOT, "backend"), (n) => n.endsWith(".test.ts")),
  ...findTests(path.join(ROOT, "admin", "src"), (n) => n.endsWith(".test.ts")),
];
// `test-*.js` integration/e2e scripts under the domain-shaped backend/tests/ tree.
const INTEGRATION_TESTS = findTests(
  path.join(ROOT, "backend", "tests"),
  (n) => n.startsWith("test-") && n.endsWith(".js")
);

let failed = 0;
let total = 0;

for (const file of OFFLINE_TESTS) {
  total++;
  const res = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, file)], {
    encoding: "utf8",
  });
  if (res.status === 0) {
    console.log(`PASS  ${file}`);
  } else {
    failed++;
    console.error(`FAIL  ${file}`);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trimEnd();
    if (out) console.error(out.replace(/^/gm, "      "));
  }
}

for (const file of COLOCATED_TESTS) {
  total++;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const res = spawnSync(process.execPath, ["--test", file], { encoding: "utf8" });
  if (res.status === 0) {
    console.log(`PASS  ${rel}`);
  } else {
    failed++;
    console.error(`FAIL  ${rel}`);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trimEnd();
    if (out) console.error(out.replace(/^/gm, "      "));
  }
}

for (const file of INTEGRATION_TESTS) {
  total++;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const res = spawnSync(process.execPath, [file], { encoding: "utf8" });
  if (res.status === 0) {
    console.log(`PASS  ${rel}`);
  } else {
    failed++;
    console.error(`FAIL  ${rel}`);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trimEnd();
    if (out) console.error(out.replace(/^/gm, "      "));
  }
}

console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
