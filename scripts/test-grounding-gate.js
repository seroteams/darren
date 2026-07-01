#!/usr/bin/env node
// Offline unit test for the planner-question grounding gate (reconcileQueue).
// A new planner question whose premise the session never established must be
// dropped (Jun 12 Marcus run: invented "promotion decision"); one whose
// grounding quote checks out must survive; carried-forward refs are untouched.

const fs = require("node:fs");
const path = require("node:path");
const { reconcileQueue } = require("../backend/engine/queue-manager.ts");
const { QUESTIONS_DIR } = require("../backend/engine/paths.mts");

// reconcileQueue saves surviving questions into the global bank (via the engine's
// saveQuestion → registerAlias, which rewrites _index.json). Snapshot the index up
// front and restore it verbatim at the end so a test run leaves questions/ clean —
// same pattern as test-question-integrity.js. (The runtime .yaml files are removed
// per-block by cleanupRuntime below.)
const INDEX_PATH = path.join(QUESTIONS_DIR, "_index.json");
const indexSnapshot = fs.readFileSync(INDEX_PATH, "utf8");

let failed = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? `  —  ${detail}` : ""}`);
  }
}

function cleanupRuntime(queue) {
  for (const q of queue || []) {
    const p = path.join(QUESTIONS_DIR, "_runtime", `${q.alias}.yaml`);
    try {
      fs.unlinkSync(p);
    } catch {}
  }
}

const CORPUS_NO_PROMOTION =
  "marcus is still handling clients but seems more drained and less present than usual " +
  "two heavy accounts came over in the reshuffle support handoffs keep bouncing back";

const CORPUS_WITH_PROMOTION =
  CORPUS_NO_PROMOTION + " she is up for promotion this cycle and wants to know where she stands";

function newItem(overrides = {}) {
  return {
    ref_alias: null,
    label: "Promotion read",
    name: "How did the promotion decision land with you?",
    description: "Probe the recent decision.",
    purpose: "topic",
    stage: null,
    axis_effects: [{ axis: "clarity", delta: 1 }],
    grounding: "open",
    ...overrides,
  };
}

console.log("\n─── grounding-gate unit ───");

// 1. Invented premise, marked "open" → dropped with a grounding issue
{
  const { queue, issues } = reconcileQueue([newItem()], {
    remainingQueue: [],
    askedAliases: new Set(),
    askedNames: [],
    meetingType: null,
    groundingCorpus: CORPUS_NO_PROMOTION,
  });
  check("invented premise (open) → dropped", queue.length === 0, JSON.stringify(queue.map((q) => q.name)));
  check(
    "drop is logged as a grounding issue",
    issues.some((i) => i.startsWith("grounding:")),
    JSON.stringify(issues)
  );
  cleanupRuntime(queue);
}

// 2. Unverifiable grounding quote → dropped
{
  const { queue, issues } = reconcileQueue(
    [newItem({ grounding: "she asked about the promotion" })],
    {
      remainingQueue: [],
      askedAliases: new Set(),
      askedNames: [],
      meetingType: null,
      groundingCorpus: CORPUS_NO_PROMOTION,
    }
  );
  check("unverifiable quote → dropped", queue.length === 0, JSON.stringify(issues));
  cleanupRuntime(queue);
}

// 3. Premise the session actually raised → kept (and grounding rides along)
{
  const { queue, issues } = reconcileQueue(
    [newItem({ grounding: "up for promotion this cycle" })],
    {
      remainingQueue: [],
      askedAliases: new Set(),
      askedNames: [],
      meetingType: null,
      groundingCorpus: CORPUS_WITH_PROMOTION,
    }
  );
  check("session-raised premise → kept", queue.length === 1, JSON.stringify(issues));
  check("grounding carried on the question object", queue[0]?.grounding === "up for promotion this cycle");
  cleanupRuntime(queue);
}

// 4. Carried-forward ref (unchanged) is untouched by the gate
{
  const ref = {
    alias: "q_existing_load",
    label: "Load check",
    name: "What has taken the most energy this week?",
    description: "Existing bank question.",
    purpose: "wellbeing",
    stage: null,
    axis_effects: { wellbeing: 1 },
    source: "generated",
  };
  const { queue } = reconcileQueue(
    [
      {
        ref_alias: "q_existing_load",
        label: ref.label,
        name: ref.name,
        description: ref.description,
        purpose: ref.purpose,
        stage: ref.stage,
        axis_effects: [{ axis: "wellbeing", delta: 1 }],
        grounding: "open",
      },
    ],
    {
      remainingQueue: [ref],
      askedAliases: new Set(),
      askedNames: [],
      meetingType: null,
      groundingCorpus: CORPUS_NO_PROMOTION,
    }
  );
  check("unchanged carried ref → untouched", queue.length === 1 && queue[0] === ref, JSON.stringify(queue));
}

// 4b. Carried ref returned WITHOUT axis_effects → signature inherited, not dropped
//     (Phase 5: the old order dropped these before ref resolution, bleeding
//     signatures out of runs until every axis shipped "not read").
{
  const ref = {
    alias: "q_existing_energy",
    label: "Energy check",
    name: "Where has your energy been going lately?",
    description: "Existing bank question.",
    purpose: "wellbeing",
    stage: null,
    axis_effects: { wellbeing: 3, engagement: 1 },
    source: "generated",
  };
  const { queue, issues } = reconcileQueue(
    [
      {
        ref_alias: "q_existing_energy",
        label: ref.label,
        name: ref.name,
        description: ref.description,
        purpose: ref.purpose,
        stage: ref.stage,
        axis_effects: [],
        grounding: "open",
      },
    ],
    {
      remainingQueue: [ref],
      askedAliases: new Set(),
      askedNames: [],
      meetingType: null,
      groundingCorpus: CORPUS_NO_PROMOTION,
    }
  );
  check(
    "carried ref without effects → inherits signature",
    queue.length === 1 && queue[0] === ref,
    JSON.stringify({ queue: queue.map((q) => q.alias), issues })
  );
  check(
    "inheritance is logged",
    issues.some((i) => i.startsWith("inherited axis_effects from q_existing_energy")),
    JSON.stringify(issues)
  );
}

// 5. No corpus supplied (legacy caller) → gate inert
{
  const { queue } = reconcileQueue([newItem()], {
    remainingQueue: [],
    askedAliases: new Set(),
    askedNames: [],
    meetingType: null,
  });
  check("no corpus → gate inert", queue.length === 1, JSON.stringify(queue.map((q) => q.name)));
  cleanupRuntime(queue);
}

// Restore the index exactly as it was before the test ran.
try { fs.writeFileSync(INDEX_PATH, indexSnapshot); } catch {}

console.log(`\n  ${failed === 0 ? "all grounding-gate tests passed" : `${failed} grounding-gate test(s) failed`}\n`);
process.exit(failed ? 1 : 0);
