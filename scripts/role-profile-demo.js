// Generate (or reuse) a role profile and print it readably.
// Run: node scripts/role-profile-demo.js "Staff Site Reliability Engineer" "Senior"
const { loadEnv } = require("../backend/engine/env.ts");
loadEnv();

const { ensureRoleProfile, profilePath } = require("../backend/engine/role-profile.ts");

const [role, seniority] = process.argv.slice(2);
if (!role || !seniority) {
  console.log('Usage: node scripts/role-profile-demo.js "<job title>" "<seniority>"');
  process.exit(1);
}

ensureRoleProfile({ role, seniority }).then((result) => {
  console.log(`\nrole profile: ${result.status} (${result.key || "no key"})`);
  if (!result.doc) {
    if (result.error) console.log(`  reason: ${result.error}`);
    process.exit(result.status === "unavailable" ? 1 : 0);
  }
  const p = result.doc.profile;
  console.log(`saved at: ${profilePath(result.key)}`);
  console.log(`\n${role} — ${seniority}  (confidence: ${p.role_confidence})`);
  console.log(`\nSummary:\n  ${p.summary}`);
  console.log("\nKnown challenges:");
  for (const c of p.known_challenges) console.log(`  - [${c.category}] ${c.text}`);
  console.log("\nQuestion themes:");
  for (const t of p.recommended_question_themes) console.log(`  - [${t.category}] ${t.theme} — ${t.why}`);
  console.log("\nTerminology:");
  for (const t of p.terminology) console.log(`  - ${t.term}: ${t.meaning}`);
  console.log("\nListen for:");
  for (const s of p.listen_for) console.log(`  - ${s}`);
  console.log("\nAvoid:");
  for (const a of p.avoid) console.log(`  - ${a}`);
});
