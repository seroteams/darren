#!/usr/bin/env node
// Replay a regression scenario — prep stage + validator assertions.
// Run: node scripts/replay-scenario.js toby_growth_lead
//      node scripts/replay-scenario.js toby_growth_lead --fixtures-only  (no API)
//      node scripts/replay-scenario.js toby_growth_lead --check-transcript <path>  (offline arc checks)

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { loadEnv } = require("../src/env");
loadEnv();

const { validateBrief, generatePreparation } = require("../src/preparation");

function loadScenario(id) {
  const file = path.join(ROOT, "scenarios", "regression", `${id}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Scenario not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function prepInputs(scenario) {
  const p = scenario.prep;
  return {
    name: p.name,
    roleTitle: p.role,
    seniority: p.seniority,
    meetingType: p.meetingType,
    observedShift: p.notes || "",
    focusPoints: p.focusPoints || [],
  };
}

function runFixtureChecks(scenario) {
  const inputs = prepInputs(scenario);
  let failed = 0;
  for (const fx of scenario.fixtures || []) {
    const { issues } = validateBrief(fx.brief, inputs);
    const joined = issues.join(" ");
    let fxFailed = 0;
    for (const sub of fx.expectIssueSubstrings || []) {
      if (!joined.toLowerCase().includes(sub.toLowerCase())) {
        console.error(`  FAIL  fixture "${fx.label}" — expected issue containing: ${sub}`);
        console.error(`        got: ${issues.join("; ") || "(none)"}`);
        fxFailed += 1;
      }
    }
    if ((fx.expectIssueSubstrings || []).length === 0 && issues.length > 0) {
      console.error(`  FAIL  fixture "${fx.label}" — expected no issues, got: ${issues.join("; ")}`);
      fxFailed += 1;
    }
    if (fxFailed === 0) {
      console.log(`  PASS  fixture "${fx.label}" (${issues.length} validator note(s))`);
    } else {
      failed += fxFailed;
    }
  }
  return failed;
}

function checkField(label, text, rules) {
  const failures = [];
  const s = String(text || "");
  const lower = s.toLowerCase();
  for (const pat of rules.mustNotMatch || []) {
    if (new RegExp(pat, "i").test(s)) failures.push(`${label} matches banned pattern: ${pat}`);
  }
  for (const word of rules.mustNotContain || []) {
    if (lower.includes(word.toLowerCase())) failures.push(`${label} contains banned phrase: ${word}`);
  }
  if (rules.mustMatchAny?.length) {
    const ok = rules.mustMatchAny.some((pat) => new RegExp(pat, "i").test(s));
    if (!ok) failures.push(`${label} missing required pattern (one of: ${rules.mustMatchAny.join(", ")})`);
  }
  return failures;
}

// D6 — offline arc-coverage checks against a recorded transcript.json.
// Reads `scenario.arc` and asserts the transcript hits each expected stage,
// never exceeds the wellbeing-clarifier cap, and reaches the closer stage.
function runTranscriptArcChecks(scenario, transcriptPath) {
  const expect = scenario.arc;
  if (!expect) {
    console.log("  (no `arc` block in scenario — skipping transcript checks)");
    return 0;
  }
  if (!fs.existsSync(transcriptPath)) {
    console.error(`  FAIL  transcript file not found: ${transcriptPath}`);
    return 1;
  }
  let transcript;
  try {
    transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf8"));
  } catch (e) {
    console.error(`  FAIL  transcript parse: ${e.message}`);
    return 1;
  }
  if (!Array.isArray(transcript)) {
    console.error(`  FAIL  transcript is not an array`);
    return 1;
  }
  let failed = 0;

  const stagesSeen = new Set(
    transcript.map((t) => t?.question?.stage).filter((s) => s)
  );
  for (const stage of expect.expectStages || []) {
    if (stagesSeen.has(stage)) {
      console.log(`  PASS  arc stage covered: ${stage}`);
    } else {
      console.error(`  FAIL  arc stage missing: ${stage}`);
      failed += 1;
    }
  }

  if (typeof expect.maxConsecutiveWellbeingClarifiers === "number") {
    const cap = expect.maxConsecutiveWellbeingClarifiers;
    let run = 0;
    let maxRun = 0;
    for (const t of transcript) {
      const q = t?.question;
      if (q?.source === "planner_added" && q.purpose === "wellbeing") {
        run += 1;
        if (run > maxRun) maxRun = run;
      } else {
        run = 0;
      }
    }
    if (maxRun <= cap) {
      console.log(`  PASS  consecutive wellbeing clarifiers <= ${cap} (max ${maxRun})`);
    } else {
      console.error(`  FAIL  consecutive wellbeing clarifiers exceeded cap ${cap} (saw ${maxRun})`);
      failed += 1;
    }
  }

  if (typeof expect.maxOffArcDrills === "number") {
    const cap = expect.maxOffArcDrills;
    const offArc = transcript.filter((t) => {
      const q = t?.question;
      return q?.source === "planner_added" && (q.stage === null || q.stage === undefined);
    }).length;
    if (offArc <= cap) {
      console.log(`  PASS  off-arc tangents <= ${cap} (saw ${offArc})`);
    } else {
      console.error(`  FAIL  off-arc tangents exceeded cap ${cap} (saw ${offArc})`);
      failed += 1;
    }
  }

  if (expect.closerStage) {
    if (stagesSeen.has(expect.closerStage)) {
      console.log(`  PASS  closer stage reached: ${expect.closerStage}`);
    } else {
      console.error(`  FAIL  closer stage never reached: ${expect.closerStage}`);
      failed += 1;
    }
  }

  return failed;
}

function runLiveChecks(brief, scenario) {
  const live = scenario.live || {};
  const failures = [];
  if (live.openingQuestion) {
    failures.push(...checkField("openingQuestion", brief.openingQuestion, live.openingQuestion));
  }
  if (live.goodOutcome) {
    failures.push(...checkField("goodOutcome", brief.goodOutcome, live.goodOutcome));
  }
  if (live.suggestedAction) {
    failures.push(...checkField("suggestedAction", brief.suggestedAction, live.suggestedAction));
  }
  if (live.listenFor?.eachMustMatchAny) {
    for (const item of brief.listenFor || []) {
      const ok = live.listenFor.eachMustMatchAny.some((pat) => new RegExp(pat, "i").test(String(item)));
      if (!ok) failures.push(`listenFor item missing behavioural cue: "${String(item).slice(0, 70)}…"`);
    }
  }
  return failures;
}

async function main() {
  const id = process.argv[2];
  const fixturesOnly = process.argv.includes("--fixtures-only");
  const transcriptFlagIdx = process.argv.indexOf("--check-transcript");
  const transcriptPath = transcriptFlagIdx > 0 ? process.argv[transcriptFlagIdx + 1] : null;
  if (!id) {
    console.error("Usage: node scripts/replay-scenario.js <scenario-id> [--fixtures-only] [--check-transcript <path>]");
    process.exit(2);
  }

  const scenario = loadScenario(id);
  console.log(`\nReplay: ${scenario.id} — ${scenario.description || ""}\n`);

  console.log("─── Validator fixtures (offline) ───");
  const fixtureFails = runFixtureChecks(scenario);
  if (fixtureFails > 0) {
    console.log(`\n${fixtureFails} fixture check(s) failed.\n`);
    process.exit(1);
  }

  if (transcriptPath) {
    console.log("\n─── Transcript arc checks (offline) ───");
    const arcFails = runTranscriptArcChecks(scenario, transcriptPath);
    if (arcFails > 0) {
      console.log(`\n${arcFails} arc check(s) failed.\n`);
      process.exit(1);
    }
  }

  if (fixturesOnly) {
    console.log("\n✓ Fixtures passed (--fixtures-only, skipping live prep).\n");
    process.exit(0);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set — skipping live prep (fixtures passed).\n");
    process.exit(0);
  }

  console.log("─── Live prep generation ───");
  const inputs = prepInputs(scenario);
  const { brief, validation } = await generatePreparation(inputs, { session: null });
  console.log("  openingQuestion:", brief.openingQuestion);
  console.log("  validator issues:", validation.issues.length ? validation.issues.join("; ") : "(none)");

  const liveFails = runLiveChecks(brief, scenario);
  if (liveFails.length) {
    liveFails.forEach((f) => console.error(`  FAIL  ${f}`));
    console.log();
    process.exit(1);
  }

  console.log("\n✓ Live prep passed scenario assertions.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
