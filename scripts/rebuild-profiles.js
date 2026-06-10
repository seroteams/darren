#!/usr/bin/env node
// Rebuild per-person profiles from finished runs on disk.
//   node scripts/rebuild-profiles.js          rebuild everyone
//   node scripts/rebuild-profiles.js maya     rebuild one person

const path = require("node:path");
const { collectPersonRuns, buildProfile, slugify, PEOPLE_ROOT } = require("../src/person-profile");

const arg = process.argv[2];

if (arg) {
  const slug = slugify(arg);
  const result = slug ? buildProfile(slug) : null;
  if (!result) {
    console.error(`No finished runs found for "${arg}".`);
    process.exit(1);
  }
  console.log(`${result.name}: ${result.runCount} runs -> ${path.join(PEOPLE_ROOT, slug, "profile.md")}`);
} else {
  const people = collectPersonRuns();
  if (people.size === 0) {
    console.error("No finished runs on disk.");
    process.exit(1);
  }
  for (const slug of [...people.keys()].sort()) {
    const result = buildProfile(slug);
    console.log(`${result.name.padEnd(20)} ${String(result.runCount).padStart(3)} runs  data/people/${slug}/`);
  }
  console.log(`\n${people.size} people.`);
}
