#!/usr/bin/env node
// Offline test: build a cassette + scenario from a run folder (agent-native P1).
// The builder turns any logs/<month>/<run-id>/ folder into (a) a cassette the
// engine can replay with $0 spend and (b) a scenario file carrying the run's
// intake + answers, so a bug bundle reproduces end-to-end offline.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { buildCassetteFromRun, synthesizeScenario } = require("./lib/cassette-from-run.js");

function makeFixtureRun() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cassette-run-"));
  const write = (rel, content) => {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  };
  write("01-focus-points/inputs.json", {
    name: "Test Person",
    role: "Designer",
    seniority: "Senior",
    meetingType: "Bi-weekly check-in",
    notes: "some manager notes",
  });
  write("01-focus-points/response.json", '{"focus_points":[]}');
  write("01b-preparation/response.json", '{"coreIssue":"x"}');
  // Bank logs a WRAPPED response — the raw string sits under .raw:
  write("03-question-bank/response.json", { raw: '{"questions":[]}', saved_aliases: ["q_a"] });
  write("04-dynamic-answers/01-response.json", '{"plan":"turn1"}');
  write("04-dynamic-answers/02-response.json", '{"plan":"turn2"}');
  write("05-evaluation/response.json", '{"briefing":"final"}');
  write("transcript.json", [
    { turn: 1, answer: "first answer", skipped: false },
    { turn: 2, answer: "", skipped: true },
  ]);
  return dir;
}

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`PASS  ${label}`);
  } catch (e) {
    failures += 1;
    console.log(`FAIL  ${label} — ${e.message}`);
  }
}

const runDir = makeFixtureRun();
const { entries } = buildCassetteFromRun(runDir);

check("entries follow pipeline order with the right labels", () => {
  assert.deepEqual(
    entries.map((e) => e.label),
    [
      "01-focus-points",
      "01b-preparation",
      "01b-preparation-retry", // prep's single logged raw serves the retry label too
      "03-question-bank",
      "04-plan-turn",
      "04-plan-turn",
      "05-evaluation",
    ],
  );
});

check("question-bank response is unwrapped to the raw string", () => {
  const bank = entries.find((e) => e.label === "03-question-bank");
  assert.equal(bank.response, '{"questions":[]}');
});

check("planner turns keep file order", () => {
  const turns = entries.filter((e) => e.label === "04-plan-turn").map((e) => e.response);
  assert.deepEqual(turns, ['{"plan":"turn1"}', '{"plan":"turn2"}']);
});

check("missing role-profile stage is simply absent (cached profiles never call the model)", () => {
  assert.equal(entries.some((e) => e.label === "00b-role-profile"), false);
});

check("scenario carries the run's intake + answers, skips as (skipped)", () => {
  const s = synthesizeScenario(runDir);
  assert.equal(s.name, "Test Person");
  assert.equal(s.role, "Designer");
  assert.equal(s.seniority, "Senior");
  assert.equal(s.meeting_type, "Bi-weekly check-in");
  assert.equal(s.manager_notes, "some manager notes");
  assert.deepEqual(s.answers, ["first answer", "(skipped)"]);
});

fs.rmSync(runDir, { recursive: true, force: true });
if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall cassette-from-run checks passed");
