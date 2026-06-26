// Renders all 5 stage prompts offline and reports whether the role-profile
// block (or its fallback) landed in each. No API spend.
// Run: node scripts/check-role-profile-injection.js ["<job title>" "<seniority>" ["<meeting type>"]]
const { FALLBACK_BLOCK } = require("../backend/engine/role-profile.ts");

const role = process.argv[2] || "Staff Site Reliability Engineer";
const seniority = process.argv[3] || "Senior";
const meetingType = process.argv[4] || "Growth & career plan";
const ctx = { name: "Alex", role, seniority, meetingType, notes: "" };

const axes = [{ id: "wellbeing" }, { id: "engagement" }, { id: "clarity" }, { id: "growth" }];

const stages = {
  "focus points": () =>
    require("../backend/engine/generate.ts").buildMessages({ ...ctx, focusPoints: [] }),
  "preparation": () =>
    require("../backend/engine/preparation").buildMessages({
      name: ctx.name,
      roleTitle: role,
      seniority,
      meetingType,
      observedShift: "",
      focusPoints: [],
    }),
  "question bank": () =>
    require("../backend/engine/question-generator").buildMessages({
      axes,
      focusPoints: [],
      ...ctx,
      existingQueue: [],
    }),
  "per-turn planner": () =>
    require("../backend/engine/queue-manager").buildMessages({
      axes,
      focusPoints: [],
      ctx,
      transcript: [],
      lastQuestion: { alias: "q_x", name: "How are things?", stage: "self_read", axis_effects: {} },
      lastAnswer: "Fine.",
      axisState: {},
      remainingQueue: [],
      remainingBudget: 5,
      turnNumber: 1,
      totalTurns: 9,
      closerAlias: "q_closer",
    }),
  "final evaluation": () =>
    require("../backend/engine/reviewer").buildMessages({
      ctx,
      focusPoints: [],
      transcript: [],
      axisState: {},
      notes: "",
    }),
};

console.log(`\nRole: ${role} · Seniority: ${seniority} · Meeting type: ${meetingType}\n`);
let failed = 0;
for (const [label, build] of Object.entries(stages)) {
  try {
    const { filled } = build();
    const hasBlock = filled.includes("<role_profile>");
    const hasFallback = filled.includes(FALLBACK_BLOCK);
    const leftover = filled.match(/\{\{[A-Z][A-Z0-9_]*\}\}/g);
    let status;
    if (hasBlock) status = "role profile injected";
    else if (hasFallback) status = "fallback line (no profile on disk)";
    else { status = "MISSING — neither block nor fallback"; failed += 1; }
    if (leftover && leftover.includes("{{ROLE_PROFILE_BLOCK}}")) {
      status += " — UNRESOLVED PLACEHOLDER";
      failed += 1;
    }
    console.log(`  ${label.padEnd(18)} ${status}`);
  } catch (e) {
    console.log(`  ${label.padEnd(18)} ERROR — ${e.message}`);
    failed += 1;
  }
}
console.log();
process.exit(failed ? 1 : 0);
