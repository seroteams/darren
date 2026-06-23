#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { pickOpener } = require("../backend/engine/opener");
const { QUESTIONS_DIR } = require("../backend/engine/paths");

const OPENERS_PATH = path.join(QUESTIONS_DIR, "_openers.json");

const MEETING_CASES = [
  { slug: "bi_weekly_check_in", pretty: "Bi-weekly check-in" },
  { slug: "growth_career_plan", pretty: "Growth & career plan" },
  { slug: "performance_feedback", pretty: "Performance & feedback" },
  { slug: "something_feels_off", pretty: "Something feels off" },
];

const openers = JSON.parse(fs.readFileSync(OPENERS_PATH, "utf8"));
const byAlias = new Map(openers.map((o) => [o.alias, o]));
const badAliases = [];

for (const { slug, pretty } of MEETING_CASES) {
  for (let i = 0; i < 100; i += 1) {
    let picked;
    try {
      picked = pickOpener({
        meetingType: pretty,
        role: "Engineer",
        seniority: "Senior",
      });
    } catch (err) {
      console.error(`pickOpener threw for ${slug} on iteration ${i + 1}: ${err.message}`);
      process.exit(1);
    }

    if (!picked || !picked.alias || !byAlias.has(picked.alias)) {
      console.error(`Unknown opener alias for ${slug}: ${JSON.stringify(picked)}`);
      process.exit(1);
    }

    if (slug === "growth_career_plan" && picked.alias === "q_open_most_like_yourself") {
      badAliases.push(`${slug}:${picked.alias}`);
    }

    const openerRecord = byAlias.get(picked.alias);
    if (openerRecord && /nourish/i.test(openerRecord.name || "")) {
      badAliases.push(`${slug}:${picked.alias}`);
    }
  }
}

if (badAliases.length > 0) {
  console.error("Forbidden opener alias selected:");
  for (const bad of badAliases) console.error(`- ${bad}`);
  process.exit(1);
}

console.log("PASS test-opener-routing");
