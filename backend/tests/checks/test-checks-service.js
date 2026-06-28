#!/usr/bin/env node
// Phase 3 (Tasks board run-checks button) safety net. The /api/checks/run
// endpoint may ONLY ever run free, offline checks — the test suite and an
// offline (--fixtures-only) replay. It must refuse anything that could hit the
// OpenAI API (gate/smoke/eval/live replays), because those cost money.
//
// These tests pin that promise: the allow-list resolves only the two free
// checks, every allow-listed command is provably free, and a non-free id is
// refused BEFORE anything is ever spawned.

const assert = require("node:assert/strict");
const {
  listChecks,
  resolveCheck,
  runFreeCheck,
} = require("../../api/services/checks/checks.service.ts");

const PAID_TOKENS = ["gate", "smoke", "eval"];

// 1. The two free checks resolve to the commands we expect.
{
  const tests = resolveCheck("tests");
  assert.ok(tests.argv.some((a) => a.endsWith("run-tests.js")), "tests check runs run-tests.js");
  assert.ok(typeof tests.label === "string" && tests.label.length > 0, "tests check has a label");

  const replay = resolveCheck("replay");
  assert.ok(replay.argv.some((a) => a.includes("replay-scenario")), "replay check runs replay-scenario");
  assert.ok(replay.argv.includes("--fixtures-only"), "replay check is offline (--fixtures-only)");
}

// 2. The WHOLE allow-list is free: no paid command, every replay is offline.
{
  const all = listChecks();
  assert.ok(all.length >= 2, "at least the two free checks are listed");
  for (const spec of all) {
    for (const token of PAID_TOKENS) {
      assert.ok(
        !spec.argv.some((a) => a.includes(token)),
        `allow-listed check "${spec.id}" must not reference paid command "${token}"`
      );
    }
    if (spec.argv.some((a) => a.includes("replay-scenario"))) {
      assert.ok(
        spec.argv.includes("--fixtures-only"),
        `replay check "${spec.id}" must be offline (--fixtures-only)`
      );
    }
  }
}

// 3. Non-free / unknown ids are refused with a 400 — never silently allowed.
{
  const refused = ["gate", "smoke", "eval", "", "live", "tests; rm -rf /", "../secret"];
  for (const id of refused) {
    let threw = false;
    try {
      resolveCheck(id);
    } catch (e) {
      threw = true;
      assert.equal(e.status, 400, `refusing "${id}" should be a 400`);
    }
    assert.ok(threw, `resolveCheck must refuse "${id}"`);
  }
}

// 4. runFreeCheck refuses a non-free id BEFORE spawning anything.
{
  let spawned = false;
  const spy = () => {
    spawned = true;
    return { status: 0, stdout: "", stderr: "" };
  };
  let threw = false;
  try {
    runFreeCheck("gate", spy);
  } catch (e) {
    threw = true;
    assert.equal(e.status, 400);
  }
  assert.ok(threw, "runFreeCheck refuses a non-free id");
  assert.equal(spawned, false, "nothing is spawned for a refused id");
}

// 5. A passing run -> ok:true with a readable summary; node + the right script
//    are spawned (no shell string, so nothing can be injected).
{
  let captured = null;
  const fakePass = (file, args) => {
    captured = { file, args };
    return { status: 0, stdout: "PASS test-foo\n\n30/30 passed\n", stderr: "" };
  };
  const res = runFreeCheck("tests", fakePass);
  assert.equal(res.ok, true, "exit 0 => ok");
  assert.ok(/30\/30/.test(res.summary), "summary reports the pass count");
  assert.equal(captured.file, process.execPath, "spawns node itself, not a shell");
  assert.ok(captured.args.some((a) => a.endsWith("run-tests.js")), "spawns the allow-listed script");
}

// 6. A failing run -> ok:false, and the failure detail is surfaced (engine honesty).
{
  const fakeFail = () => ({ status: 1, stdout: "FAIL test-bar\n\n29/30 passed\n", stderr: "" });
  const res = runFreeCheck("tests", fakeFail);
  assert.equal(res.ok, false, "non-zero exit => not ok");
  assert.ok(/test-bar|29\/30/.test(`${res.summary} ${res.output}`), "failure detail is surfaced");
}

console.log("PASS test-checks-service");
