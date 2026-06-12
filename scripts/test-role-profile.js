// Verifies the role-profile layer offline — no API spend.
// Run: node scripts/test-role-profile.js
const fs = require("node:fs");
const path = require("node:path");

const {
  PROFILES_DIR,
  PROMPT_PATH,
  PROFILE_VERSION,
  FALLBACK_BLOCK,
  keyOf,
  profilePath,
  loadRoleProfile,
  renderRoleProfileBlock,
  buildMessages,
} = require("../src/role-profile");

let failed = 0;
function ok(label, cond) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failed += 1;
  }
}

const FIXTURE = {
  version: PROFILE_VERSION,
  prompt_version: "deadbeef",
  model: "test",
  generated_at: 0,
  role_title_raw: "Staff Site Reliability Engineer",
  role_slug: "staff-site-reliability-engineer",
  seniority_raw: "Senior",
  seniority_key: "senior",
  role_family: "engineering",
  profile: {
    summary: "Owns reliability of production systems across teams.",
    role_confidence: "high",
    known_challenges: [
      { text: "On-call load erodes recovery time", category: "wellbeing" },
      { text: "Negotiating error budgets with feature teams", category: "topic" },
      { text: "Stretching from firefighting to prevention design", category: "competency" },
    ],
    recommended_question_themes: [
      { theme: "Sustainability of the on-call rotation", why: "burnout risk", category: "wellbeing" },
      { theme: "Cross-team influence on reliability standards", why: "staff scope", category: "competency" },
      { theme: "State of the incident review process", why: "core of the work", category: "topic" },
    ],
    terminology: [
      { term: "SLO", meaning: "target level of reliability promised to users" },
      { term: "toil", meaning: "manual repetitive operational work worth automating" },
    ],
    listen_for: ["whether they volunteer incident examples"],
    avoid: ["treating reliability work as invisible until something breaks"],
  },
};

console.log("\n--- keyOf: exact-title slugging ---");
ok(
  "'Sr. SRE (Platform)' + 'Senior' → sr-sre-platform--senior",
  keyOf({ role: "Sr. SRE (Platform)", seniority: "Senior" }) === "sr-sre-platform--senior"
);
ok(
  "'Staff Site Reliability Engineer' + 'Senior' keys cleanly",
  keyOf({ role: "Staff Site Reliability Engineer", seniority: "Senior" }) ===
    "staff-site-reliability-engineer--senior"
);
ok("missing role → null", keyOf({ role: "", seniority: "Senior" }) === null);
ok("missing seniority → null", keyOf({ role: "Engineer", seniority: "" }) === null);
ok(
  "different titles → different keys (no family coarsening)",
  keyOf({ role: "Staff SRE", seniority: "Senior" }) !== keyOf({ role: "Software Engineer", seniority: "Senior" })
);

console.log("\n--- loadRoleProfile: null-safe reads ---");
ok("missing file → null", loadRoleProfile({ role: "No Such Job Ever", seniority: "Mythic" }) === null);

const tmpRole = "__test-role-profile__";
const tmpKey = keyOf({ role: tmpRole, seniority: "senior" });
const tmpFile = profilePath(tmpKey);
fs.mkdirSync(PROFILES_DIR, { recursive: true });
try {
  fs.writeFileSync(tmpFile, "{ this is not json");
  ok("corrupt file → null (no throw)", loadRoleProfile({ role: tmpRole, seniority: "senior" }) === null);

  fs.writeFileSync(tmpFile, JSON.stringify({ ...FIXTURE, version: 999 }));
  ok("wrong version → null", loadRoleProfile({ role: tmpRole, seniority: "senior" }) === null);

  fs.writeFileSync(tmpFile, JSON.stringify(FIXTURE));
  const loaded = loadRoleProfile({ role: tmpRole, seniority: "senior" });
  ok("valid file loads", Boolean(loaded) && loaded.profile.summary === FIXTURE.profile.summary);
} finally {
  fs.rmSync(tmpFile, { force: true });
}

console.log("\n--- renderRoleProfileBlock: slices ---");
const full = renderRoleProfileBlock(FIXTURE, { slice: "full", meetingType: "Growth & career plan" });
ok("full: wrapped in <role_profile> tags", full.startsWith("<role_profile>") && full.endsWith("</role_profile>"));
ok("full: has summary", full.includes("Owns reliability of production systems"));
ok("full: has challenges", full.includes("On-call load erodes recovery time"));
ok("full: has themes", full.includes("Cross-team influence on reliability standards"));
ok("full: has terminology", full.includes("SLO:"));
ok("full: has listen_for", full.includes("whether they volunteer incident examples"));
ok("full: has avoid", full.includes("treating reliability work as invisible"));
ok("full: names role and seniority", full.includes("Senior Staff Site Reliability Engineer"));

const planner = renderRoleProfileBlock(FIXTURE, { slice: "planner", meetingType: "Growth & career plan" });
ok("planner slim: has summary + terms + listen_for", planner.includes("SLO:") && planner.includes("incident examples"));
ok("planner slim: no challenges, no themes", !planner.includes("On-call load") && !planner.includes("Worth exploring"));

const focus = renderRoleProfileBlock(FIXTURE, { slice: "focus", meetingType: "Growth & career plan" });
ok("focus slim: has challenges", focus.includes("On-call load erodes recovery time"));
ok("focus slim: no terminology, no listen_for", !focus.includes("SLO:") && !focus.includes("Listen for:"));

const evalSlice = renderRoleProfileBlock(FIXTURE, { slice: "eval", meetingType: "Growth & career plan" });
ok("eval slice: has terminology + challenges", evalSlice.includes("SLO:") && evalSlice.includes("On-call load"));
ok("eval slice: no themes", !evalSlice.includes("Worth exploring"));

console.log("\n--- focus-arc rule: relational arcs drop competency items ---");
const biweekly = renderRoleProfileBlock(FIXTURE, { slice: "full", meetingType: "Bi-weekly check-in" });
ok("bi-weekly: competency challenge dropped", !biweekly.includes("firefighting to prevention design"));
ok("bi-weekly: competency theme dropped", !biweekly.includes("Cross-team influence"));
ok("bi-weekly: wellbeing/topic items kept", biweekly.includes("On-call load") && biweekly.includes("error budgets"));
const feelsOff = renderRoleProfileBlock(FIXTURE, { slice: "full", meetingType: "Something feels off" });
ok("feels-off: competency items dropped", !feelsOff.includes("firefighting") && !feelsOff.includes("Cross-team influence"));
const growth = renderRoleProfileBlock(FIXTURE, { slice: "full", meetingType: "Growth & career plan" });
ok("growth: competency items kept", growth.includes("firefighting to prevention design"));

console.log("\n--- fallback + honesty caveat ---");
ok("null profile → fallback line", renderRoleProfileBlock(null) === FALLBACK_BLOCK);
ok("invalid shape → fallback line", renderRoleProfileBlock({ version: PROFILE_VERSION }) === FALLBACK_BLOCK);
const lowConf = renderRoleProfileBlock(
  { ...FIXTURE, profile: { ...FIXTURE.profile, role_confidence: "low" } },
  { slice: "full" }
);
ok("low confidence → caveat line", lowConf.includes("low confidence in this exact title"));
ok("high confidence → no caveat", !full.includes("low confidence in this exact title"));

// Async (cache hit needs await); runs after the sync sections, before the summary.
async function runSnapshotTest() {
  console.log("\n--- session snapshot: cache hit still logs the profile ---");
  const os = require("node:os");
  const { ensureRoleProfile } = require("../src/role-profile");
  const { promptVersionFor } = require("../src/prompt-version");
  const snapRole = "__test-snapshot-role__";
  const snapKey = keyOf({ role: snapRole, seniority: "senior" });
  const snapFile = profilePath(snapKey);
  const snapSessionDir = fs.mkdtempSync(path.join(os.tmpdir(), "role-profile-snap-"));
  try {
    // Fresh on disk (real prompt_version) → ensure takes the cached path, no API.
    fs.writeFileSync(snapFile, JSON.stringify({ ...FIXTURE, prompt_version: promptVersionFor(PROMPT_PATH) }));
    const outcome = await ensureRoleProfile({ role: snapRole, seniority: "senior" }, { session: { dir: snapSessionDir } });
    ok("cache hit resolves status=cached", outcome.status === "cached");
    const snapPath = path.join(snapSessionDir, "00b-role-profile", "profile.json");
    ok("cache hit writes profile.json into session log", fs.existsSync(snapPath));
    const snapInputs = path.join(snapSessionDir, "00b-role-profile", "inputs.json");
    ok(
      "cache hit writes inputs.json with status=cached",
      fs.existsSync(snapInputs) && JSON.parse(fs.readFileSync(snapInputs, "utf8")).status === "cached"
    );
  } finally {
    fs.rmSync(snapFile, { force: true });
    fs.rmSync(snapSessionDir, { recursive: true, force: true });
  }
}

console.log("\n--- trust gates: arc leak + vocab leak ---");
const { runRoleProfileArcGate, runRoleProfileVocabLeak } = require("../src/golden-checks");
ok("arc gate clean on growth", runRoleProfileArcGate(FIXTURE, "Growth & career plan").length === 0);
ok(
  "arc gate clean on bi-weekly (renderer filters competency)",
  runRoleProfileArcGate(FIXTURE, "Bi-weekly check-in").length === 0
);
// Planted-bad fixture: the same text exists as wellbeing AND competency, so the
// render legitimately contains it — the gate must catch the competency copy.
const planted = JSON.parse(JSON.stringify(FIXTURE));
planted.profile.known_challenges.push({ text: "On-call load erodes recovery time", category: "competency" });
ok(
  "arc gate FIRES when competency text reaches a bi-weekly render",
  runRoleProfileArcGate(planted, "Bi-weekly check-in").length > 0
);
ok("arc gate ignores missing profile", runRoleProfileArcGate(null, "Bi-weekly check-in").length === 0);
ok(
  "vocab gate clean on normal briefing",
  runRoleProfileVocabLeak({ headline: "Mara is steady but stretched", watch_for: ["whether incidents drop"] }).length === 0
);
ok(
  "vocab gate fires on scaffolding in briefing copy",
  runRoleProfileVocabLeak({ headline: "Per the role profile, Mara is on track" }).length > 0
);

console.log("\n--- prompt template: privacy + placeholder hygiene ---");
const template = fs.readFileSync(PROMPT_PATH, "utf8");
ok("template has {{ROLE_TITLE}} and {{SENIORITY}}", template.includes("{{ROLE_TITLE}}") && template.includes("{{SENIORITY}}"));
ok("template has NO {{NAME}}", !template.includes("{{NAME}}"));
ok("template has NO {{MANAGER_NOTES}}", !template.includes("{{MANAGER_NOTES}}"));
const msgs = buildMessages({ role: "Staff Site Reliability Engineer", seniority: "Senior" });
ok("filled prompt has no unresolved placeholders", !/\{\{[A-Z_]+\}\}/.test(msgs.filled));
ok("filled prompt splits into system + user", msgs.system.length > 0 && msgs.user.includes("Staff Site Reliability Engineer"));

runSnapshotTest()
  .catch((e) => {
    console.log(`  FAIL session snapshot test threw: ${e.message}`);
    failed += 1;
  })
  .finally(() => {
    console.log();
    if (failed) {
      console.log(`  ${failed} check(s) FAILED`);
      process.exit(1);
    }
    console.log("  All checks passed.");
  });
