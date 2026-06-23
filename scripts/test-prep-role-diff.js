#!/usr/bin/env node
// Verification: same meeting type + concern, different role/seniority → different prep brief.
// Run: node scripts/test-prep-role-diff.js

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { loadEnv } = require("../backend/engine/env");
loadEnv();

const { generatePreparation } = require("../backend/engine/preparation");

const SHARED = {
  meetingType: "Bi-weekly check-in",
  notes: "",
  selectedConcerns: ["Clarity on priorities"],
};

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set.");
    process.exit(1);
  }

  console.log("\nRunning role-diff test...\n");

  const [runA, runB] = await Promise.all([
    generatePreparation({
      name: "Alex",
      role: "Junior Software Engineer",
      seniority: "junior",
      ...SHARED,
    }),
    generatePreparation({
      name: "Sam",
      role: "Engineering Director",
      seniority: "director",
      ...SHARED,
    }),
  ]);

  const briefA = runA.brief;
  const briefB = runB.brief;

  console.log("─── Run A: Junior Engineer ─────────────────────────────");
  console.log("coreIssue:       ", briefA.coreIssue);
  console.log("openingQuestion: ", briefA.openingQuestion);
  console.log();
  console.log("─── Run B: Engineering Director ────────────────────────");
  console.log("coreIssue:       ", briefB.coreIssue);
  console.log("openingQuestion: ", briefB.openingQuestion);
  console.log();

  const issues = [];

  if (briefA.coreIssue.trim() === briefB.coreIssue.trim()) {
    issues.push("FAIL: coreIssue is identical between junior and director");
  }
  if (briefA.openingQuestion.trim() === briefB.openingQuestion.trim()) {
    issues.push("FAIL: openingQuestion is identical between junior and director");
  }

  const juniorLower = (briefA.coreIssue + " " + briefA.openingQuestion).toLowerCase();
  const directorLower = (briefB.coreIssue + " " + briefB.openingQuestion).toLowerCase();
  const overlapScore = juniorLower.split(" ").filter(w => w.length > 4 && directorLower.includes(w)).length;
  if (overlapScore > 20) {
    issues.push(`WARN: outputs may be too similar (${overlapScore} shared meaningful words)`);
  }

  if (issues.length === 0) {
    console.log("✓ PASS — role and seniority produce meaningfully different prep briefs.\n");
    process.exit(0);
  } else {
    issues.forEach(i => console.log(i));
    console.log();
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Test error:", err.message);
  process.exit(1);
});
