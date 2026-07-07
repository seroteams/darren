#!/usr/bin/env node
// Prep-brief wording regression tests (offline, no API).
//
// 1. validateBrief flags the frozen Jun 11 Machar brief for both observed
//    wording bugs: job title instead of the name, and "air cover" jargon.
// 2. A corrected brief clears both flags (other checks may still fire — we
//    assert only on the wording flags).
// 3. findJargon catches observed terms and stays quiet on plain language.
// 4. The prompts carry the new rules, so a prompt edit can't silently drop them.

const fs = require("node:fs");
const path = require("node:path");

const { validateBrief, buildPrepInput } = require("../backend/engine/preparation.ts");
const { findJargon } = require("../backend/engine/golden-checks.ts");

let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ROOT = path.join(__dirname, "..");
const { PROMPTS_DIR } = require("../backend/engine/paths.mts");
const MACHAR_INPUTS = {
  name: "Machar",
  roleTitle: "Partner alliance manager",
  seniority: "Lead",
  meetingType: "Bi-weekly check-in",
  focusPoints: [],
};

// --- 1. frozen Jun 11 brief trips both wording flags
const frozenBrief = JSON.parse(
  fs.readFileSync(path.join(ROOT, "evals", "fixtures", "machar-jun11-brief.json"), "utf8")
);
{
  const { issues } = validateBrief(frozenBrief, MACHAR_INPUTS);
  check(
    "frozen brief: title-instead-of-name flagged",
    issues.some((i) => /refer to Machar by name/i.test(i)),
    JSON.stringify(issues)
  );
  check(
    "frozen brief: 'air cover' jargon flagged",
    issues.some((i) => /jargon "air cover"/i.test(i)),
    JSON.stringify(issues)
  );
}

// --- 2. corrected brief clears both flags
{
  const corrected = {
    ...frozenBrief,
    coreIssue:
      "This check-in is likely about what support Machar needs as more of his time goes into selling partnership value.",
    listenFor: [
      "whether he names one repeat objection or stall point that keeps coming up",
      "whether he volunteers where backing from above, assets, or faster decisions would help",
      "whether he sounds stretched across too many conversations or one specific deal path",
    ],
  };
  const { issues } = validateBrief(corrected, MACHAR_INPUTS);
  check(
    "corrected brief: no name flag",
    !issues.some((i) => /refer to Machar by name/i.test(i)),
    JSON.stringify(issues)
  );
  check(
    "corrected brief: no jargon flag",
    !issues.some((i) => /jargon/i.test(i)),
    JSON.stringify(issues)
  );
}

// --- 3. findJargon behaviour
check("findJargon catches 'air cover'", findJargon("Where would air cover from me help most?") === "air cover");
check("findJargon catches 'circle back'", findJargon("Let's circle back next week") === "circle back");
check("findJargon quiet on plain language", findJargon("Where would backing from me help most right now?") === null);
check(
  "findJargon quiet on 'bandwidth' (prompt recommends it for bi-weekly openers)",
  findJargon("How is your bandwidth this fortnight?") === null
);

// --- 4. prompts carry the rules
{
  const prep = fs.readFileSync(path.join(PROMPTS_DIR, "preparation.md"), "utf8");
  check("preparation.md: name-not-title rule present", /never (?:by their job title|describe them by their job title)/i.test(prep));
  check("preparation.md: jargon ban present", /air cover/i.test(prep));
  check("preparation.md: clean-ending rule for suggestedAction", /ends cleanly/i.test(prep));
  check("preparation.md: relational-arc gate present", /Relational-arc gate/.test(prep));
  check(
    "preparation.md: relational-arc gate names both meeting types",
    /Bi-weekly check-in and Something feels off/.test(prep)
  );
  check(
    "preparation.md: relational-arc gate lists the competency ids",
    /decision_making_speed/.test(prep) && /stakeholder_engagement/.test(prep)
  );

  const gen = fs.readFileSync(path.join(PROMPTS_DIR, "generate-questions.md"), "utf8");
  check("generate-questions.md: jargon ban present", /air cover/i.test(gen));
}

// --- 5. runner relational-arc gate: a competency primary is dropped before send
{
  const gated = buildPrepInput({
    name: "Priya",
    roleTitle: "Backend engineer",
    seniority: "Senior",
    meetingType: "bi_weekly_check_in",
    primaryFocusId: "quality",
    focusPoints: [
      { id: "quality", label: "Quality" },
      { id: "workload", label: "Workload" },
    ],
    selectedFocus: { id: "quality", label: "Quality" },
  });
  check(
    "relational arc: competency primary neutralised",
    gated.primaryFocusId !== "quality",
    `primaryFocusId=${gated.primaryFocusId}`
  );
  check(
    "relational arc: competency focus point stripped from payload",
    !gated.focusPoints.some((fp) => fp.id === "quality"),
    JSON.stringify(gated.focusPoints.map((f) => f.id))
  );

  const kept = buildPrepInput({
    name: "Priya",
    roleTitle: "Backend engineer",
    seniority: "Senior",
    meetingType: "Performance & feedback",
    primaryFocusId: "quality",
    focusPoints: [{ id: "quality", label: "Quality" }],
    selectedFocus: { id: "quality", label: "Quality" },
  });
  check(
    "non-relational arc: competency primary preserved",
    kept.primaryFocusId === "quality",
    `primaryFocusId=${kept.primaryFocusId}`
  );
}

// --- 6. validator enforces listenFor / avoid shape + 28-word caps
{
  const priya = { name: "Priya", roleTitle: "Backend engineer", seniority: "Senior", meetingType: "bi_weekly_check_in", focusPoints: [] };
  const cleanBrief = {
    coreIssue: "This check-in is about the workload Priya is carrying this fortnight.",
    openingQuestion: "How has your workload felt over the last couple of weeks from your side?",
    listenFor: [
      "whether she names a specific project eating her time",
      "whether she volunteers where the pressure is coming from",
      "if they mention a deadline that slipped this sprint",
    ],
    avoid: ["do not turn this into a status audit", "do not jump to fixes before she names the pressure"],
    goodOutcome: "You and Priya have agreed one concrete thing to take off her plate this fortnight, senior scope.",
    suggestedAction: "Before the 1:1, pick one recent week and note what filled it.",
    confidence: "Medium — based on your note and her workload",
    dontAssume: "That she is overloaded; a busy fortnight can have mundane causes.",
  };
  const clean = validateBrief(cleanBrief, priya);
  check("clean brief passes the validator", clean.passed, JSON.stringify(clean.issues));

  const badBrief = {
    ...cleanBrief,
    listenFor: [
      "he deflects the workload question",
      "whether she names a project",
      "if they mention a slip this sprint",
    ],
    avoid: ["turn this into a status audit", "do not jump to fixes"],
    coreIssue:
      "This check-in is about the workload Priya is carrying and also a very long tail that keeps going on and on well past the twenty-eight word ceiling that this one tight sentence is actually allowed to use.",
  };
  const bad = validateBrief(badBrief, priya);
  check("bad listenFor prefix flagged", bad.issues.some((i) => /must start with "whether"/.test(i)), JSON.stringify(bad.issues));
  check("bad avoid prefix flagged", bad.issues.some((i) => /avoid item must start/.test(i)), JSON.stringify(bad.issues));
  check("over-long coreIssue flagged (max 28)", bad.issues.some((i) => /coreIssue is too long/.test(i)), JSON.stringify(bad.issues));
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nPASS test-prep-wording");
