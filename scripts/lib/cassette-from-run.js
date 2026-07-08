// Build a replayable cassette + a scenario from an existing run folder
// (logs/<month>/<run-id>/ or a user's diagnostic bundle — same layout).
//
// Recon (agent-native P1, 2026-07-08): every stage logs its RAW model string —
// focus/prep/role/eval as the whole response.json, question-bank wrapped under
// `.raw`, planner turns as 04-dynamic-answers/NN-response.json (runs after
// ~Jul 01; older runs lack the per-turn raws and can't replay the turn loop).
// Preparation logs only its FINAL attempt, so that raw serves both the
// "01b-preparation" and "01b-preparation-retry" labels.

const fs = require("node:fs");
const path = require("node:path");

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function maybeText(p) {
  try {
    return readText(p);
  } catch {
    return null;
  }
}

// The bank's response.json wraps the raw string ({ raw, saved_aliases, ... });
// older/other stages log the raw string as the whole file.
function unwrapRaw(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && typeof parsed.raw === "string") return parsed.raw;
  } catch {
    // not JSON — already the raw string
  }
  return text;
}

function buildCassetteFromRun(runDir) {
  const entries = [];
  const push = (label, response) => entries.push({ label, response });

  const roleProfile = maybeText(path.join(runDir, "00b-role-profile", "response.json"));
  if (roleProfile !== null) push("00b-role-profile", roleProfile);

  const focus = maybeText(path.join(runDir, "01-focus-points", "response.json"));
  if (focus !== null) push("01-focus-points", focus);

  const prep = maybeText(path.join(runDir, "01b-preparation", "response.json"));
  if (prep !== null) {
    push("01b-preparation", prep);
    push("01b-preparation-retry", prep);
  }

  const bank = maybeText(path.join(runDir, "03-question-bank", "response.json"));
  if (bank !== null) push("03-question-bank", unwrapRaw(bank));

  const turnsDir = path.join(runDir, "04-dynamic-answers");
  if (fs.existsSync(turnsDir)) {
    const turnFiles = fs
      .readdirSync(turnsDir)
      .filter((f) => /^\d+-response\.json$/.test(f))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    for (const f of turnFiles) push("04-plan-turn", readText(path.join(turnsDir, f)));
  }

  const evaluation = maybeText(path.join(runDir, "05-evaluation", "response.json"));
  if (evaluation !== null) push("05-evaluation", evaluation);

  return { entries };
}

// A scenario in the shape smoke-test.js drives: intake fields + one answer per
// turn, taken from the run's own transcript ("(skipped)" keeps skips skips).
function synthesizeScenario(runDir) {
  const inputs = JSON.parse(readText(path.join(runDir, "01-focus-points", "inputs.json")));
  const transcript = JSON.parse(readText(path.join(runDir, "transcript.json")));
  const answers = [...transcript]
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))
    .map((t) => (t.skipped || !String(t.answer ?? "").trim() ? "(skipped)" : t.answer));
  return {
    name: inputs.name,
    role: inputs.role,
    seniority: inputs.seniority,
    meeting_type: inputs.meetingType,
    manager_notes: inputs.notes || "",
    answers,
  };
}

function writeCassette(outDir, entries) {
  fs.mkdirSync(outDir, { recursive: true });
  const p = path.join(outDir, "cassette.json");
  fs.writeFileSync(p, `${JSON.stringify({ entries }, null, 2)}\n`);
  return p;
}

module.exports = { buildCassetteFromRun, synthesizeScenario, writeCassette };
