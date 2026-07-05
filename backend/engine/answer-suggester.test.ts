import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isConcrete,
  hasEnoughConcrete,
  pickBetterAnswers,
  buildUserMessage,
  sanitizeAnswer,
} from "./answer-suggester.ts";

// --- slot-label leak (seen live 2026-07-05: model prefixed its job label) ----

test("sanitizeAnswer strips a leaked slot label", () => {
  assert.equal(
    sanitizeAnswer("INCIDENT — Atlas dashboard handoff slipped; notes reached Leo Chen after planning."),
    "Atlas dashboard handoff slipped; notes reached Leo Chen after planning."
  );
  assert.equal(
    sanitizeAnswer("Guarded: Kept it short on the check-in gap; said it was fine, then moved on."),
    "Kept it short on the check-in gap; said it was fine, then moved on."
  );
  assert.equal(
    sanitizeAnswer("OFF-SCRIPT — Pulse onboarding still lands well; Mina keeps praising the wireframes."),
    "Pulse onboarding still lands well; Mina keeps praising the wireframes."
  );
});

// --- isConcrete (the anti-vagueness lint) -----------------------------------

test("isConcrete accepts a note naming a person mid-sentence", () => {
  assert.ok(isConcrete("Handoff with Priya slipped twice — specs missing edge states."));
});

test("isConcrete accepts a note with a number", () => {
  assert.ok(isConcrete("Missed 3 review slots since the sprint change."));
});

test("isConcrete accepts a quoted phrase", () => {
  assert.ok(isConcrete('Says the review calendar is "a lottery" — wants fewer surprise crits.'));
});

test("isConcrete rejects a note with no specifics", () => {
  assert.ok(!isConcrete("Feels heavier lately; more tension across the team since the last check-in."));
});

test("isConcrete does not count sentence-start capitals as specifics", () => {
  assert.ok(!isConcrete("Checks main screens. Doesn't check edge cases before sharing."));
});

test("isConcrete rejects fog words even alongside a specific", () => {
  assert.ok(!isConcrete("Friction with Priya on the checkout redesign handoffs."));
  assert.ok(!isConcrete("Bandwidth thin since the Atlas launch started."));
});

// --- hasEnoughConcrete (set-level gate: guarded slot may stay vague) --------

const CONCRETE = "Handoff with Priya slipped twice — specs missing edge states.";
const VAGUE = "Keeps it short; says things are mostly fine lately.";

test("hasEnoughConcrete allows one vague note out of three", () => {
  assert.ok(hasEnoughConcrete([CONCRETE, VAGUE, CONCRETE]));
});

test("hasEnoughConcrete fails when two of three notes are vague", () => {
  assert.ok(!hasEnoughConcrete([CONCRETE, VAGUE, VAGUE]));
});

test("hasEnoughConcrete allows one vague note out of two", () => {
  assert.ok(hasEnoughConcrete([CONCRETE, VAGUE]));
});

test("hasEnoughConcrete fails an empty list", () => {
  assert.ok(!hasEnoughConcrete([]));
});

// --- pickBetterAnswers (first call vs retry) ---------------------------------

test("pickBetterAnswers prefers the set that passes the concreteness gate", () => {
  const vagueSet = [VAGUE, VAGUE, VAGUE];
  const concreteSet = [CONCRETE, VAGUE, CONCRETE];
  assert.deepEqual(pickBetterAnswers(vagueSet, concreteSet), concreteSet);
  assert.deepEqual(pickBetterAnswers(concreteSet, vagueSet), concreteSet);
});

test("pickBetterAnswers prefers more notes when neither set passes", () => {
  const one = [VAGUE];
  const two = [VAGUE, VAGUE];
  assert.deepEqual(pickBetterAnswers(one, two), two);
});

// --- buildUserMessage (scenario pack goes into the prompt) -------------------

const PACK = {
  projects: ["Checkout redesign", "Design-system audit"],
  coworkers: ["Priya (eng lead)", "Tom (PM)"],
  incident: "Handoff on the checkout redesign slipped twice.",
  goingWell: "Design-system audit ahead of schedule.",
};

const BASE = {
  name: "Darren",
  role: "UX Designer",
  seniority: "Lead",
  meetingType: "Weekly 1:1",
  notes: "Seems short-tempered lately.",
  question: "What's been on your mind since our last chat?",
};

test("buildUserMessage embeds the scenario pack and asks to reuse its names", () => {
  const msg = buildUserMessage({ ...BASE, scenarioPack: PACK });
  assert.ok(msg.includes("Checkout redesign"));
  assert.ok(msg.includes("Priya (eng lead)"));
  assert.ok(msg.includes(PACK.incident));
  assert.ok(/reuse/i.test(msg));
});

test("buildUserMessage omits the world block when there is no pack", () => {
  const msg = buildUserMessage({ ...BASE });
  assert.ok(!msg.includes("report's world"));
});
