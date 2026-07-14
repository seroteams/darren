#!/usr/bin/env node
"use strict";

// H5 — "did a change make the writing worse?"
//
// gate.js and replay compare trust-check VERDICTS (and offline replay re-grades a
// FROZEN model response). Neither notices a prompt edit that stays schema-valid
// and trust-clean but makes the write-up blander or less specific. This harness
// re-generates the golden cases LIVE and compares the produced write-up's PROSE
// to an approved snapshot (evals/prose-snapshots/<id>.json). A field reworded
// past tolerance is the hard signal; the LLM judge (--judge) adds an advisory
// better/worse/same.
//
// PAID: it runs the real pipeline. Cost-gated — you must name a case
// (--only <id>, ~$0.35) or opt into the full sweep (--all, ~$3).

const fs = require("node:fs");
const path = require("node:path");
const { runSmoke } = require("./lib/run-scenario");
const { diffProse, snapshotProse } = require("./lib/prose-diff");
const { CONTENT_DIR } = require("../backend/engine/paths.mts");

const ROOT = path.join(__dirname, "..");
const GOLDEN_DIR = path.join(ROOT, "evals", "golden");
const SNAP_DIR = path.join(ROOT, "evals", "prose-snapshots");

function loadJson(p, fb = undefined) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fb;
  }
}

function loadGoldenCases(only) {
  const index = loadJson(path.join(GOLDEN_DIR, "_index.json"), []);
  const cases = index.map((row) => loadJson(path.join(GOLDEN_DIR, row.file))).filter(Boolean);
  return only ? cases.filter((c) => c.id === only) : cases;
}

// Read the produced briefing, tolerating the {raw:"<json>"} double-encoding the
// pipeline sometimes writes (same tolerance as scripts/gate.js loadBriefing).
function loadBriefing(sessionDir) {
  const p = path.join(sessionDir, "05-evaluation", "response.json");
  if (!fs.existsSync(p)) return null;
  try {
    let b = JSON.parse(fs.readFileSync(p, "utf8"));
    if (b && typeof b.raw === "string") b = JSON.parse(b.raw);
    return b;
  } catch {
    return null;
  }
}

function sessionComplete(dir) {
  return Boolean(dir) && fs.existsSync(path.join(dir, "05-evaluation", "response.json"));
}

function snapPath(id) {
  return path.join(SNAP_DIR, `${id}.json`);
}

function parseArgs(argv) {
  const a = { update: false, all: false, judge: false, only: null, tolerance: 0.8 };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--update") a.update = true;
    else if (t === "--all") a.all = true;
    else if (t === "--judge") a.judge = true;
    else if (t === "--only") a.only = argv[++i];
    else if (t === "--tolerance") a.tolerance = Number(argv[++i]);
  }
  return a;
}

function usage() {
  console.error(
    "PAID harness — name a case or opt into the sweep:\n" +
      "  node scripts/golden-prose-snapshot.js --only <id>     (~$0.35)\n" +
      "  node scripts/golden-prose-snapshot.js --all           (~$3, all 8 cases)\n" +
      "\noptions:\n" +
      "  --update        bless the current output as the approved snapshot\n" +
      "  --judge         add an advisory better/worse/same from the LLM judge\n" +
      "  --tolerance <n> similarity floor per field (default 0.8; lower = laxer)\n",
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.only && !args.all) {
    usage();
    process.exit(2);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set — this harness runs the live pipeline.");
    process.exit(2);
  }

  const cases = loadGoldenCases(args.only);
  if (!cases.length) {
    console.error(args.only ? `No golden case "${args.only}".` : "No golden cases in evals/golden/_index.json.");
    process.exit(2);
  }

  fs.mkdirSync(SNAP_DIR, { recursive: true });
  let regressions = 0;

  for (const def of cases) {
    const scenarioPath = path.join(CONTENT_DIR, def.scenario);
    if (!fs.existsSync(scenarioPath)) {
      console.log(`  SKIP    ${def.id} — scenario not found (${def.scenario})`);
      continue;
    }

    // Run the pipeline; retry once on an infra flake so it is not read as drift.
    let smoke = await runSmoke(scenarioPath);
    if (!sessionComplete(smoke.sessionDir)) smoke = await runSmoke(scenarioPath);
    if (!sessionComplete(smoke.sessionDir)) {
      console.log(`  ERROR   ${def.id} — pipeline incomplete (exit ${smoke.code})`);
      regressions += 1;
      continue;
    }

    const briefing = loadBriefing(smoke.sessionDir);
    if (!briefing) {
      console.log(`  ERROR   ${def.id} — no briefing produced`);
      regressions += 1;
      continue;
    }

    if (args.update) {
      fs.writeFileSync(snapPath(def.id), `${JSON.stringify({ id: def.id, prose: snapshotProse(briefing) }, null, 2)}\n`);
      console.log(`  BLESSED ${def.id} → evals/prose-snapshots/${def.id}.json`);
      continue;
    }

    const snap = loadJson(snapPath(def.id));
    if (!snap || !snap.prose) {
      console.log(`  NO SNAP ${def.id} — run with --update first to bless the approved wording`);
      regressions += 1;
      continue;
    }

    const diff = diffProse(snap.prose, briefing, { tolerance: args.tolerance });
    if (diff.changed) {
      regressions += 1;
      const reworded = diff.fields.filter((f) => f.changed).map((f) => `${f.field}(${f.ratio})`);
      console.log(`  DRIFTED ${def.id} — overall ${diff.overall}; reworded: ${reworded.join(", ")}`);
    } else {
      console.log(`  OK      ${def.id} — overall ${diff.overall}`);
    }

    if (args.judge) {
      try {
        const { judgeSession } = require("./eval-judge");
        const scenario = loadJson(scenarioPath);
        const j = await judgeSession({ sessionDir: smoke.sessionDir, scenario });
        const flags = (j.flags || []).length ? ` — ${j.flags.join("; ")}` : "";
        console.log(`          judge ${j.score}/5${flags}`);
      } catch (e) {
        console.log(`          judge unavailable: ${e.message}`);
      }
    }
  }

  if (!args.update && regressions > 0) {
    console.log(`\n  ${regressions} case(s) drifted or missing a snapshot.`);
    process.exit(1);
  }
  console.log("\n  done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
