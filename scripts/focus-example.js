#!/usr/bin/env node
// Promote a run's focus points into a paste-ready prompt example.
//
// The learning loop: when a test run produces a focus list you'd keep, paste it
// into the <examples> block of prompts/generate-focus-points.md so the model
// copies the pattern next time. This prints it already formatted as
// `id · label · reason · source` under a scenario header — copy, paste, done.
//
//   node scripts/focus-example.js <runId>     one run
//   node scripts/focus-example.js --keepers   every run marked "keep" in its review
//
// Read-only. Discipline (see the examples block): keep 1–2 diverse examples per
// meeting type, REPLACE weak ones rather than piling on — too many similar
// examples make the model parrot them and recreate the sameness this fights.

const fs = require("node:fs");
const path = require("node:path");
const { findRunDir, listFinishedRuns } = require("../backend/engine/run-history");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function flat(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

// Build the example block for one run, or null if it has no usable focus output.
function renderExample(runId) {
  const dir = findRunDir(runId);
  if (!dir) return { error: `run not found: ${runId}` };

  const response = readJson(path.join(dir, "01-focus-points", "response.json"));
  const points = response?.focus_points;
  if (!Array.isArray(points) || points.length === 0) {
    return { error: `no focus points in run: ${runId}` };
  }

  // Prefer the focus-stage inputs (the notes that actually drove this output);
  // fall back to session-state ctx.
  const inputs = readJson(path.join(dir, "01-focus-points", "inputs.json")) || {};
  const state = readJson(path.join(dir, "session-state.json")) || {};
  const ctx = state.ctx || {};
  const role = inputs.role || ctx.role || "(role)";
  const seniority = inputs.seniority || ctx.seniority || "(seniority)";
  const meetingType = inputs.meetingType || response.meeting_type || ctx.meetingType || "(meeting type)";
  const notes = flat(inputs.notes || (state.notes || []).map((n) => n.text).join(" ")) || "(no notes)";

  const lines = [
    `**Example (promoted from ${runId})**`,
    `(${role} / ${seniority} / ${meetingType}; notes: "${notes}"):`,
    "",
    ...points.map(
      (fp) => `- \`${fp.id}\` · "${flat(fp.label)}" · "${flat(fp.reason)}" · \`${fp.source}\``
    ),
  ];
  return { text: lines.join("\n") };
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: node scripts/focus-example.js <runId> | --keepers");
    process.exit(2);
  }

  let ids;
  if (arg === "--keepers") {
    ids = listFinishedRuns()
      .filter((r) => r.overall === "keep")
      .map((r) => r.id);
    if (ids.length === 0) {
      console.error('no runs marked "keep" — review a run (overall: keep) first.');
      process.exit(1);
    }
  } else {
    ids = [arg];
  }

  let failed = 0;
  ids.forEach((id, i) => {
    const out = renderExample(id);
    if (out.error) {
      console.error(`  (skip) ${out.error}`);
      failed += 1;
      return;
    }
    if (i > 0) console.log("\n");
    console.log(out.text);
  });
  process.exit(failed && ids.length === 1 ? 1 : 0);
}

main();
