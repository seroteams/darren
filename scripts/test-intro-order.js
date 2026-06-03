#!/usr/bin/env node

const { loadIntroQueue, sortIntroByArc } = require("../src/intro-queue");
const { selectReservedCloser, isForbiddenCloser } = require("../src/closer");
const questions = require("../src/questions");

const biWeekly = loadIntroQueue("Bi-weekly check-in", 3);
if (!biWeekly.length || biWeekly[0].stage !== "pulse") {
  console.error(`Expected bi-weekly intro to start at pulse, got ${biWeekly[0]?.stage}`);
  process.exit(1);
}

const growth = loadIntroQueue("Growth & career plan", 3);
if (!growth.length || growth[0].stage !== "anchor") {
  console.error(`Expected growth intro to start at anchor, got ${growth[0]?.stage}`);
  process.exit(1);
}

const feelsOff = loadIntroQueue("Something feels off", 3);
if (!feelsOff.length || feelsOff[0].stage !== "landing") {
  console.error(`Expected feels-off intro to start at landing, got ${feelsOff[0]?.stage}`);
  process.exit(1);
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
