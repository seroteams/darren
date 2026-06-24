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

const { validateBrief } = require("../backend/engine/preparation");
const { findJargon } = require("../backend/engine/golden-checks");

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

  const gen = fs.readFileSync(path.join(PROMPTS_DIR, "generate-questions.md"), "utf8");
  check("generate-questions.md: jargon ban present", /air cover/i.test(gen));
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nPASS test-prep-wording");
