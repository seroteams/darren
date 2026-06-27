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
const {
  buildThreadFollowQuestion,
  enforceThreadFollow,
} = require("../backend/engine/queue-manager.ts");
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
  "gate allows outside-work opener where the type has no rule against it",
  checkQuestionEligibility(
    { name: "What's been the best part of your world outside of work lately?" },
    { meetingType: "Onboarding check-in" }
  ).ok === true
);

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

// --- 4. thread-follow grounds or skips
{
  const lastQ = { purpose: "topic", stage: "friction", axis_effects: { clarity: 1 } };
  // enforceThreadFollow saves injected questions into the global bank —
  // snapshot the index, collect what this test creates, and restore both at
  // the end so test runs don't pollute questions/.
  const createdAliases = [];
  const QUESTIONS_ROOT = QUESTIONS_DIR;
  const INDEX_PATH = path.join(QUESTIONS_ROOT, "_index.json");
  const indexSnapshot = fs.readFileSync(INDEX_PATH, "utf8");

  const grounded = buildThreadFollowQuestion(
    lastQ,
    "leadership keeps stalling the partner rollout",
    []
  );
  check(
    "thread-follow mirrors the answer's words when it can ground",
    Boolean(grounded) && /leadership/i.test(grounded.name)
  );

  check(
    "thread-follow returns null on an empty/junk answer",
    buildThreadFollowQuestion(lastQ, "ok", []) === null
  );

  // A long substantive answer deserves a real planner follow-up, not the vague
  // mirror — skip rather than fake the connection (the Jun 11 disconnect).
  check(
    "thread-follow skips on a long substantive answer instead of using a canned stem",
    buildThreadFollowQuestion(
      lastQ,
      "leadership and corporate communication keep stalling the rollout across six different teams",
      []
    ) === null
  );

  // The Jun 11 failure shape: same answer thread two turns running must not
  // produce two near-identical injected questions.
  const issues1 = [];
  const q1 = enforceThreadFollow({
    newQueue: [{ alias: "q_x", name: "Which customer path is taking the most of your time right now?" }],
    lastAnswer: "leadership keeps stalling the partner rollout",
    lastQuestion: lastQ,
    remainingBudget: 5,
    consecutiveDrillCount: 0,
    askedNames: [],
    transcript: [],
    issues: issues1,
  });
  const injected = q1[0]?.label === "Thread follow" ? q1[0] : null;
  if (injected?.alias) createdAliases.push(injected.alias);
  check("thread-follow injects on an unfollowed mid-length answer", Boolean(injected));

  const issues2 = [];
  const q2 = enforceThreadFollow({
    newQueue: [{ alias: "q_y", name: "Which customer path is taking the most of your time right now?" }],
    lastAnswer: "leadership keeps stalling the partner rollout",
    lastQuestion: lastQ,
    remainingBudget: 4,
    consecutiveDrillCount: 0,
    askedNames: injected ? [injected.name] : [],
    transcript: [],
    issues: issues2,
  });
  check(
    "second identical thread-follow is skipped as a repeat",
    !injected || q2[0]?.label !== "Thread follow"
  );

  check("no debug text in injected description", !injected || !/\b(runtime|injected|planner)\b/i.test(injected.description));

  // Cleanup: remove the question files this test created and restore the
  // index exactly as it was before the test ran.
  for (const alias of createdAliases) {
    try { fs.unlinkSync(path.join(QUESTIONS_ROOT, `${alias}.yaml`)); } catch {}
  }
  try { fs.writeFileSync(INDEX_PATH, indexSnapshot); } catch {}
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
