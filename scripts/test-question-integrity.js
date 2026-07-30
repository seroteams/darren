#!/usr/bin/env node
// Question-integrity regression tests (offline, no API).
//
// 1. The eligibility gate rejects forbidden patterns and duplicate text.
// 2. pickOpener can never serve a forbidden opener for bi-weekly.
// 3. pickSeedOverflow skips forbidden / duplicate seeds.
// 4. Thread-follow grounds in the answer or skips — never a canned stem,
//    never a repeat of an already-asked question.
// 5. NEGATIVE TEST: the frozen Jun 11 Machar demo transcript must trip
//    checkQuestionIntegrity on all four observed bugs (forbidden opener,
//    duplicate thread-follow, debug text in description, foreign bank
//    question). If detection ever goes quiet on that run, this fails.

const fs = require("node:fs");
const path = require("node:path");

const {
  checkQuestionEligibility,
  dropIneligibleHeads,
  isDuplicateText,
} = require("../backend/engine/question-eligibility.ts");
const { pickOpener } = require("../backend/engine/opener.ts");
const { pickSeedOverflow } = require("../backend/engine/closer.ts");
const { markThreadFollow } = require("../backend/engine/queue-manager.ts");
const { checkQuestionIntegrity } = require("../evals/trust-checks.ts");
const { QUESTIONS_DIR } = require("../backend/engine/paths.mts");

let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const BIWEEKLY = "Bi-weekly check-in";

// --- 1. gate basics
check(
  "gate rejects outside-work opener for bi-weekly",
  checkQuestionEligibility(
    { name: "What's been the best part of your world outside of work lately?" },
    { meetingType: BIWEEKLY }
  ).ok === false
);
check(
  "gate rejects 'clearly successful in one sentence' for bi-weekly",
  checkQuestionEligibility(
    { name: "What would make this quarter clearly successful for you — in one sentence?" },
    { meetingType: BIWEEKLY }
  ).ok === false
);
check(
  "gate allows a normal bi-weekly question",
  checkQuestionEligibility(
    { name: "What objection keeps coming up most often in those partnership conversations?" },
    { meetingType: BIWEEKLY }
  ).ok === true
);
check(
  "gate rejects near-duplicate of an asked question",
  checkQuestionEligibility(
    { name: "What made you read the situation that way at the time?" },
    {
      meetingType: BIWEEKLY,
      askedNames: ["What made you read the situation that way at the time?"],
    }
  ).ok === false
);
check(
  "gate allows outside-work opener for onboarding (its gate is assessment-only)",
  checkQuestionEligibility(
    { name: "What's been the best part of your world outside of work lately?" },
    { meetingType: "Onboarding check-in" }
  ).ok === true
);

// --- 1b. per-type gates (arc-evidence-fixes P1): each type rejects its banned
// shapes and accepts a normal question of its own register.
const TYPE_GATE_CASES = [
  {
    type: "Performance & feedback",
    reject: [
      "Do you think you're just careless with the details?",
      "How do you feel about your attitude lately?",
    ],
    accept: "Walk me through what you checked before the handoff went to review.",
  },
  {
    type: "Growth & career plan",
    reject: [
      "If we promise you the promotion this cycle, what would change for you?",
      "You'll be promoted once this lands — what would you take on next?",
    ],
    accept: "Which stakeholder exposure would stretch you most next quarter?",
  },
  {
    type: "Something feels off",
    reject: [
      "Are you feeling burned out by the pace?",
      "Do you think you're stressed about the reorg?",
    ],
    accept: "I've noticed you've been quieter in reviews lately — how are things landing for you?",
  },
  {
    type: "Onboarding check-in",
    reject: [
      "Are you on track with what we expect so far?",
      "How do you feel you're meeting expectations so far?",
    ],
    accept: "What's still unclear about how decisions get made here?",
  },
  {
    type: BIWEEKLY,
    reject: ["Have you been feeling burned out lately?"],
    accept: "Where would a faster decision from me unblock you?",
  },
];
for (const { type, reject, accept } of TYPE_GATE_CASES) {
  for (const name of reject) {
    check(
      `gate rejects for ${type}: "${name.slice(0, 40)}…"`,
      checkQuestionEligibility({ name }, { meetingType: type }).ok === false
    );
  }
  check(
    `gate accepts a normal ${type} question`,
    checkQuestionEligibility({ name: accept }, { meetingType: type }).ok === true
  );
}

// --- 2. opener routing can never serve a forbidden bi-weekly opener
{
  let bad = null;
  for (let i = 0; i < 200 && !bad; i += 1) {
    const picked = pickOpener({ meetingType: BIWEEKLY, role: "Engineer", seniority: "Senior" });
    const res = checkQuestionEligibility(picked, { meetingType: BIWEEKLY });
    if (!res.ok) bad = `${picked.alias} (${res.matched})`;
  }
  check("pickOpener serves no forbidden opener for bi-weekly (200 trials)", !bad, bad);
}

// --- 3. seed overflow respects the gate
{
  const seeds = [
    {
      alias: "q_seed_clarity_success",
      label: "Success definition",
      name: "What would make this quarter clearly successful for you — in one sentence?",
    },
    {
      alias: "q_seed_blocker",
      label: "Blocker",
      name: "Where are you waiting on someone else before you can move?",
    },
  ];
  const rejections = [];
  const seed = pickSeedOverflow(seeds, new Set(), {
    meetingType: BIWEEKLY,
    askedNames: [],
    rejections,
  });
  check("seed overflow skips the forbidden seed", seed?.alias === "q_seed_blocker");
  check("seed overflow logs the rejection", rejections.length === 1 && rejections[0].reason === "forbidden_pattern");

  const dupRejections = [];
  const dupSeed = pickSeedOverflow([seeds[1]], new Set(), {
    meetingType: BIWEEKLY,
    askedNames: ["Where are you waiting on someone else before you can move?"],
    rejections: dupRejections,
  });
  check("seed overflow skips a duplicate of an asked question", dupSeed === null);
  check("duplicate seed rejection logged", dupRejections.length === 1 && dupRejections[0].reason === "duplicate_text");
}

// --- 4. the engine marks the model's follow-up, it never writes one
// Until 2026-07-30 the engine minted the follow-up itself from one fixed
// sentence (`You said "…" — what's behind that for you right now?`). It read as
// bland on every turn it fired, sliced quotes mid-word, and carried a banned em
// dash. The model owns the follow-up now (plan-turn.md <thread_follow_rule>), so
// this section pins that nothing here authors question text or touches disk.
{
  const lastQ = { purpose: "topic", stage: "friction", axis_effects: { clarity: 1 } };
  const QUESTIONS_ROOT = QUESTIONS_DIR;
  const INDEX_PATH = path.join(QUESTIONS_ROOT, "_index.json");
  const indexSnapshot = fs.readFileSync(INDEX_PATH, "utf8");
  const filesBefore = fs.readdirSync(QUESTIONS_ROOT).length;

  // The planner ignored the thread: note it, change nothing.
  const droppedIssues = [];
  const droppedQueue = [
    { alias: "q_x", name: "Which customer path is taking the most of your time right now?" },
  ];
  markThreadFollow({
    newQueue: droppedQueue,
    lastAnswer: "leadership keeps stalling the partner rollout",
    lastQuestion: lastQ,
    remainingBudget: 5,
    issues: droppedIssues,
  });
  check(
    "dropped thread is noted, not patched with a written question",
    droppedQueue.length === 1 &&
      droppedQueue[0].alias === "q_x" &&
      droppedIssues.some((i) => /dropped the open thread/i.test(i))
  );

  // The planner followed the thread: tag it so the screen can show the cue.
  const followedIssues = [];
  const followedQueue = [
    { alias: "q_y", name: "What have you tried with leadership to unblock the rollout?" },
  ];
  markThreadFollow({
    newQueue: followedQueue,
    lastAnswer: "leadership keeps stalling the partner rollout",
    lastQuestion: lastQ,
    remainingBudget: 5,
    issues: followedIssues,
  });
  check(
    "the planner's own follow-up is tagged and left alone",
    followedQueue.length === 1 &&
      followedQueue[0].follows_thread === true &&
      followedIssues.length === 0
  );

  // The old bland stem must not be reachable from anywhere in the engine. Only
  // live code counts — the file's header comment quotes the stem on purpose, to
  // record what was removed and why.
  const engineCode = fs
    .readFileSync(path.join(__dirname, "..", "backend", "engine", "thread-follow.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
  check(
    "no code-written question stem survives in thread-follow.ts",
    !/You said/i.test(engineCode) && !/what's behind that/i.test(engineCode)
  );

  check(
    "marking a follow-up writes nothing to questions/",
    fs.readdirSync(QUESTIONS_ROOT).length === filesBefore &&
      fs.readFileSync(INDEX_PATH, "utf8") === indexSnapshot
  );
}

// --- 5. frozen Jun 11 run trips every detector
{
  const FIXTURES = path.join(__dirname, "..", "evals", "fixtures");
  const transcript = JSON.parse(
    fs.readFileSync(path.join(FIXTURES, "machar-jun11-transcript.json"), "utf8")
  );
  const bankAliases = JSON.parse(
    fs.readFileSync(path.join(FIXTURES, "machar-jun11-bank-aliases.json"), "utf8")
  );
  const failures = checkQuestionIntegrity(
    transcript,
    bankAliases.map((alias) => ({ alias })),
    BIWEEKLY
  );
  const has = (re) => failures.some((f) => re.test(f));
  check("frozen run: forbidden opener detected", has(/forbidden-pattern question served/i));
  check("frozen run: duplicate thread-follow detected", has(/duplicate question text/i));
  check("frozen run: debug description detected", has(/engine-internal text/i));
  check("frozen run: foreign bank question detected", has(/not in this session's bank.*q_ba_dynamic_now/i));
}

// --- serve-time helper drops bad heads, keeps the first good one
{
  const queue = [
    { alias: "q_bad", name: "What's been the best part of your world outside of work lately?" },
    { alias: "q_dup", name: "What objection keeps coming up most often?" },
    { alias: "q_good", name: "Where would a faster decision from me unblock you?" },
  ];
  const rejected = dropIneligibleHeads(queue, {
    meetingType: BIWEEKLY,
    askedNames: ["What objection keeps coming up most often?"],
  });
  check(
    "serve-time gate drops forbidden + duplicate heads, serves the good one",
    queue[0]?.alias === "q_good" && rejected.length === 2
  );
  check(
    "serve-time rejections carry reasons",
    rejected[0]?.reason === "forbidden_pattern" && rejected[1]?.reason === "duplicate_text"
  );
}

// --- sanity: isDuplicateText is not over-eager
check(
  "follow-up reusing one topic word is not a duplicate",
  !isDuplicateText(
    "What objection keeps coming up most often in those partnership conversations?",
    "You said those teams are under strain — where does that show up most?"
  )
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nPASS test-question-integrity");
