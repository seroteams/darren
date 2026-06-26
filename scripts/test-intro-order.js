#!/usr/bin/env node

const path = require("node:path");
const { loadIntroQueue, sortIntroByArc } = require("../backend/engine/intro-queue");
const { selectReservedCloser, isForbiddenCloser } = require("../backend/engine/closer");
const { getArc } = require("../backend/engine/one-on-one-types/index.ts");
const questions = require("../backend/engine/questions.ts");

// Expected first stage = the earliest-in-arc stage among the type's intro
// questions, derived from the live arc — no hardcoded phase ids, so an arc edit
// can't leave this test asserting a stale id.
function expectedFirstStage(label) {
  const order = new Map(getArc(label).arc.map((s, i) => [s.id, i]));
  let best = null;
  let bestIdx = Infinity;
  for (const q of questions.loadDir(path.join("_intro", questions.slugify(label)))) {
    const i = order.has(q.stage) ? order.get(q.stage) : 999;
    if (i < bestIdx) {
      bestIdx = i;
      best = q.stage;
    }
  }
  return best;
}

for (const label of ["Bi-weekly check-in", "Growth & career plan", "Something feels off"]) {
  const queue = loadIntroQueue(label, 3);
  const expected = expectedFirstStage(label);
  if (!queue.length || queue[0].stage !== expected) {
    console.error(`Expected ${label} intro to start at ${expected}, got ${queue[0]?.stage}`);
    process.exit(1);
  }
}

const prioritySeed = questions.loadDir("_seed").find((q) => q.alias === "q_seed_clarity_priorities");
if (!isForbiddenCloser(prioritySeed)) {
  console.error("q_seed_clarity_priorities should be forbidden as a closer");
  process.exit(1);
}

const fakeBank = [
  { alias: "q_bad_close", stage: "lift", name: "If you had to cut your work in half tomorrow, what would you drop?" },
  { alias: "q_good_close", stage: "lift", name: "What would make the next two weeks steadier for you?" },
];
const closer = selectReservedCloser(fakeBank, "Bi-weekly check-in");
if (!closer || closer.alias !== "q_good_close") {
  console.error(`selectReservedCloser picked wrong closer: ${closer?.alias}`);
  process.exit(1);
}

const shuffled = sortIntroByArc(
  [
    { alias: "b", stage: "friction" },
    { alias: "a", stage: "pulse" },
  ],
  "Bi-weekly check-in"
);
if (shuffled[0].stage !== "pulse") {
  console.error("sortIntroByArc failed");
  process.exit(1);
}

console.log("PASS test-intro-order");
