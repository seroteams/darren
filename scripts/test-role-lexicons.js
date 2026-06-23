// Verifies the Job-lexicons layer offline — listing + the user-words overlay.
// No API spend. Run: node scripts/test-role-lexicons.js
const fs = require("node:fs");

const {
  PROFILES_DIR,
  PROFILE_VERSION,
  keyOf,
  profilePath,
  overlayPath,
  listRoleProfiles,
  loadOverlay,
  addOverlayTerm,
  removeOverlayTerm,
  effectiveTerminology,
  renderRoleProfileBlock,
} = require("../backend/engine/role-profile");

let failed = 0;
function ok(label, cond) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failed += 1;
  }
}

const ROLE = "Zz Test Joblex Role";
const key = keyOf({ role: ROLE, seniority: "Lead" });
const pFile = profilePath(key);
const oFile = overlayPath(key);

const PROFILE = {
  version: PROFILE_VERSION,
  prompt_version: "x",
  model: "test",
  generated_at: 0,
  role_title_raw: ROLE,
  role_slug: key.split("--")[0],
  seniority_raw: "Lead",
  seniority_key: "lead",
  role_family: "design",
  profile: {
    summary: "s",
    role_confidence: "high",
    known_challenges: [{ text: "c", category: "topic" }],
    recommended_question_themes: [{ theme: "t", why: "w", category: "topic" }],
    terminology: [{ term: "Wireframe", meaning: "layout" }],
    listen_for: [],
    avoid: [],
  },
};

const findMine = () => listRoleProfiles().find((r) => r.key === key);
const grab = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};

fs.mkdirSync(PROFILES_DIR, { recursive: true });
fs.rmSync(oFile, { force: true });
try {
  fs.writeFileSync(pFile, JSON.stringify(PROFILE));

  console.log("\n--- listRoleProfiles: shape + AI tagging ---");
  let mine = findMine();
  ok("the planted profile is listed", Boolean(mine));
  ok(
    "AI terms tagged source=ai",
    mine.terms.length === 1 && mine.terms[0].term === "Wireframe" && mine.terms[0].source === "ai"
  );

  console.log("\n--- addOverlayTerm: add a user word ---");
  const added = addOverlayTerm(key, { term: "Crit", meaning: "design critique" });
  ok("returns the saved entry with a timestamp", added.term === "Crit" && typeof added.added_at === "number");
  ok("overlay sidecar file is written", fs.existsSync(oFile));
  mine = findMine();
  ok("user word merged with source=you", mine.terms.some((t) => t.term === "Crit" && t.source === "you"));
  ok("AI word still present after add", mine.terms.some((t) => t.term === "Wireframe" && t.source === "ai"));

  console.log("\n--- Phase 3: user words reach the run ---");
  ok("effectiveTerminology merges the user word", effectiveTerminology(PROFILE).some((t) => t.term === "Crit"));
  const block = renderRoleProfileBlock(PROFILE, { slice: "full" });
  ok("rendered role block includes the user word", block.includes("Crit:"));
  ok("rendered role block keeps the AI word too", block.includes("Wireframe:"));

  console.log("\n--- addOverlayTerm: validation ---");
  ok("duplicate (case-insensitive) rejected 409", grab(() => addOverlayTerm(key, { term: "crit", meaning: "x" }))?.status === 409);
  ok("empty term rejected 400", grab(() => addOverlayTerm(key, { term: "   ", meaning: "x" }))?.status === 400);
  ok("unknown role rejected 404", grab(() => addOverlayTerm("no-such--role", { term: "x" }))?.status === 404);
  ok("path-traversal key rejected", grab(() => addOverlayTerm("../../evil", { term: "x" }))?.status === 404);

  console.log("\n--- removeOverlayTerm: only touches user words ---");
  removeOverlayTerm(key, "crit"); // case-insensitive
  mine = findMine();
  ok("removed user word is gone", !mine.terms.some((t) => t.term === "Crit"));
  ok("AI word untouched by remove", mine.terms.some((t) => t.term === "Wireframe" && t.source === "ai"));

  console.log("\n--- loadOverlay: null-safe ---");
  ok("missing overlay → empty list", loadOverlay("definitely--missing").added_terms.length === 0);
  ok("invalid key → empty list", loadOverlay("../nope").added_terms.length === 0);
} finally {
  fs.rmSync(pFile, { force: true });
  fs.rmSync(oFile, { force: true });
}

console.log();
if (failed) {
  console.log(`  ${failed} check(s) FAILED`);
  process.exit(1);
}
console.log("  All checks passed.");
