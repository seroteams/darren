#!/usr/bin/env node
//
// Re-run ONLY the focus-points stage against a scenario file.
// Lets us iterate on the focus-points prompt without paying for the whole
// pipeline, and compare runs side-by-side under logs/_rerun-fp/.
//
// Usage:
//   node rerun-focus-points.js scenarios/003-carl-mid-design-growth.json
//   node rerun-focus-points.js scenarios/003-carl-mid-design-growth.json --runs 3
//   node rerun-focus-points.js scenarios/003-carl-mid-design-growth.json --model gpt-4o

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("./src/env");
const { generateFocusPoints } = require("./src/generate");

loadEnv();

const argv = process.argv.slice(2);
const scenarioPath = argv.find((a) => !a.startsWith("--"));
if (!scenarioPath || !fs.existsSync(scenarioPath)) {
  console.error(`scenario not found: ${scenarioPath}`);
  process.exit(2);
}

const runsArg = argv.find((a) => a.startsWith("--runs="));
const runs = runsArg ? Number(runsArg.split("=")[1]) : argv.includes("--runs") ? Number(argv[argv.indexOf("--runs") + 1]) : 1;

const modelArg = argv.find((a) => a.startsWith("--model="));
const model = modelArg ? modelArg.split("=")[1] : argv.includes("--model") ? argv[argv.indexOf("--model") + 1] : undefined;

const raw = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
const inputs = {
  name: raw.name,
  role: raw.role,
  seniority: raw.seniority,
  meetingType: raw.meetingType ?? raw.meeting_type,
  notes: raw.notes ?? raw.manager_notes,
};

const scenarioName = path.basename(scenarioPath, path.extname(scenarioPath));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outRoot = path.join("logs", "_rerun-fp", `${scenarioName}-${stamp}`);
fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, "inputs.json"), JSON.stringify({ ...inputs, model: model ?? "(default)" }, null, 2));

(async () => {
  for (let i = 1; i <= runs; i++) {
    const runDir = runs === 1 ? outRoot : path.join(outRoot, `run-${i}`);
    if (runs > 1) fs.mkdirSync(runDir, { recursive: true });
    const session = { dir: runDir };
    const result = await generateFocusPoints(inputs, { model, session, stage: "01-focus-points" });
    fs.writeFileSync(path.join(runDir, "result.json"), JSON.stringify(result, null, 2));
    console.log(`run ${i}/${runs} → ${runDir}`);
    for (const fp of result.focus_points) {
      console.log(`  [${fp.id}] ${fp.label}`);
    }
  }
  console.log(`\nDone. Output under ${outRoot}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
