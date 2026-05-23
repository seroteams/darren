#!/usr/bin/env node
//
// Re-run ONLY the final-evaluation stage against an existing session log.
// Lets us iterate on the reviewer prompt without paying for the whole pipeline.
//
// Usage:
//   node rerun-eval.js [logs/<session-id>]        # reviews that session
//   node rerun-eval.js --latest                    # reviews newest session
//
// Writes the new briefing to <session>/05-evaluation-rerun-<ISO>/ so the
// original eval stays intact for comparison.

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("./src/env");
const { evaluate } = require("./src/reviewer");
const { renderBriefing } = require("./src/briefing");
const { modelFor } = require("./src/models");
const cost = require("./src/cost");

loadEnv();

function pickSession(argv) {
  if (argv.includes("--latest") || argv.length === 0) {
    // Sessions live at logs/<month>/<id>/. Walk one level and collect any
    // session dir containing a transcript.json.
    const candidates = [];
    for (const month of fs.readdirSync("logs")) {
      const monthDir = path.join("logs", month);
      let entries;
      try { entries = fs.readdirSync(monthDir); } catch { continue; }
      for (const id of entries) {
        const sDir = path.join(monthDir, id);
        if (fs.existsSync(path.join(sDir, "transcript.json"))) candidates.push({ id, path: sDir });
      }
    }
    if (!candidates.length) throw new Error("no sessions with transcript.json found under logs/");
    candidates.sort((a, b) => a.id.localeCompare(b.id));
    return candidates[candidates.length - 1].path;
  }
  const arg = argv.find((a) => !a.startsWith("--"));
  return arg || null;
}

const sessionPath = pickSession(process.argv.slice(2));
if (!sessionPath || !fs.existsSync(sessionPath)) {
  console.error(`session not found: ${sessionPath}`);
  process.exit(2);
}

function mustRead(rel) {
  const p = path.join(sessionPath, rel);
  if (!fs.existsSync(p)) throw new Error(`missing ${rel} in ${sessionPath}`);
  return fs.readFileSync(p, "utf8");
}

// Reconstruct the inputs to evaluate() from the session log.
const transcriptRaw = JSON.parse(mustRead("transcript.json"));
const axisState = JSON.parse(mustRead("axis-state.json"));
const fpInputs = JSON.parse(mustRead("01-focus-points/inputs.json"));
const fpResponseText = mustRead("01-focus-points/response.json");

let focusPoints;
try {
  const fpRaw = JSON.parse(fpResponseText);
  // stage 1 logs either the parsed object or a raw JSON string — handle both
  focusPoints = Array.isArray(fpRaw.focus_points)
    ? fpRaw.focus_points
    : JSON.parse(fpRaw).focus_points;
} catch {
  focusPoints = [];
}

const ctx = {
  name: fpInputs.name,
  role: fpInputs.role,
  seniority: fpInputs.seniority,
  meetingType: fpInputs.meetingType,
};
const notes = fpInputs.notes || "";

const transcript = transcriptRaw.map((t) => ({
  question: t.question.name,
  alias: t.question.alias,
  answer: t.answer,
  skipped: t.skipped,
}));

const tracker = cost.createTracker();
cost.setActive(tracker);

async function main() {
  const t0 = Date.now();
  const result = await evaluate(
    { ctx, focusPoints, transcript, axisState, notes },
    { session: null }
  );
  const duration = ((Date.now() - t0) / 1000).toFixed(1);

  console.log();
  renderBriefing(result, ctx.name);

  const c = tracker.summary();
  const model = modelFor("evaluation");
  console.log(`  [rerun · ${model} · ${duration}s · ${cost.formatUsd(c.usd_total)} · ${c.total_tokens} tok]`);
  console.log();

  // Save alongside the original so both are preserved for comparison
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const outDir = path.join(sessionPath, `05-evaluation-rerun-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "response.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(
    path.join(outDir, "cost.json"),
    JSON.stringify({ model, duration_s: Number(duration), ...c }, null, 2)
  );
  console.log(`  saved to ${outDir}/`);
}

main().catch((e) => {
  console.error(e.stack || e.message || e);
  process.exit(1);
});
