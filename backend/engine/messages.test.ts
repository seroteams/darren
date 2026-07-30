import test from "node:test";
import assert from "node:assert/strict";
import { buildMessages } from "./messages.ts";
import type { Question } from "../shared/question.types.ts";
import type { TranscriptEntry } from "../shared/session.types.ts";

// No dead wires Phase 2: the per-turn planner reads the intake note, the
// conversation vocabulary and each turn's read tag — and everything per-run
// constant stays inside the cached prompt prefix (byte-identical across turns).

const CTX = {
  meetingType: "Bi-weekly check-in",
  name: "Daryl",
  role: "UX Designer",
  seniority: "Mid",
  notes: "The Odin cutover is slipping and he has seemed flat in standups.",
};

function q(alias: string, name: string): Question {
  return {
    alias,
    label: "Test",
    name,
    description: "d",
    purpose: "wellbeing",
    stage: "pulse",
    axis_effects: { wellbeing: 1 },
    source: "generated",
  } as unknown as Question;
}

function turn(n: number, answer: string, read?: string): TranscriptEntry {
  return {
    turn: n,
    question: q(`q_${n}`, `Question ${n}?`),
    answer,
    skipped: false,
    ...(read ? { read } : {}),
  } as unknown as TranscriptEntry;
}

function build(overrides: Record<string, unknown> = {}) {
  return buildMessages({
    axes: [],
    focusPoints: [],
    ctx: CTX,
    transcript: [turn(1, "It has been a heavy fortnight.", "note")],
    lastQuestion: q("q_1", "Question 1?"),
    lastAnswer: "It has been a heavy fortnight.",
    axisState: {},
    remainingQueue: [q("q_2", "Question 2?")],
    remainingBudget: 4,
    turnNumber: 1,
    totalTurns: 6,
    closerAlias: "q_closer",
    ...overrides,
  } as Parameters<typeof buildMessages>[0]);
}

test("planner prompt carries the intake note, no unfilled placeholder", () => {
  const { filled } = build();
  assert.ok(filled.includes("The Odin cutover is slipping"), "intake note text must reach the planner prompt");
  assert.ok(!filled.includes("{{MANAGER_NOTES}}"), "MANAGER_NOTES placeholder must be filled");
});

test("planner prompt shows (none) when the intake note is empty", () => {
  const { filled } = build({ ctx: { ...CTX, notes: "" } });
  assert.ok(!filled.includes("{{MANAGER_NOTES}}"));
  assert.ok(!filled.includes("The Odin cutover"), "no ghost note");
});

test("planner prompt carries the conversation vocabulary block, no unfilled placeholders", () => {
  const { filled } = build();
  assert.ok(filled.includes("Conversation vocabulary"), "vocabulary block header present in template");
  assert.ok(!filled.includes("{{CONVERSATION_PREFER_TERMS}}"));
  assert.ok(!filled.includes("{{CONVERSATION_PREFER_PHRASES}}"));
  assert.ok(!filled.includes("{{CONVERSATION_AVOID_PHRASES}}"));
});

test("transcript summary carries each turn's read tag; absent tag stays absent (replay-safe)", () => {
  const { filled } = build({
    transcript: [turn(1, "fine", "thin"), turn(2, "A real answer about the cutover.", "note"), turn(3, "old entry")],
  });
  assert.ok(filled.includes('"read":"thin"'), "read tag must ride the transcript summary");
  assert.ok(filled.includes('"read":"note"'));
  const summaryStart = filled.indexOf("Transcript so far");
  const q3Entry = filled.slice(summaryStart).split('"alias":"q_3"')[1] || "";
  assert.ok(!q3Entry.slice(0, 80).includes('"read"'), "a turn recorded before read tags existed must not gain one");
});

test("everything per-run constant stays byte-identical across turns (cache prefix)", () => {
  const a = build().filled;
  const b = build({
    transcript: [turn(1, "fine", "thin"), turn(2, "Then we talked about the cutover at length.", "note")],
    lastQuestion: q("q_2", "Question 2?"),
    lastAnswer: "Then we talked about the cutover at length.",
    remainingQueue: [],
    remainingBudget: 3,
    turnNumber: 2,
    sessionNotes: [{ text: "He keeps glancing at his phone.", turn: 2 }],
  }).filled;
  // Anchor on the structural tag at line start; the system prose also mentions
  // `<turn_state>` in backticks, which must not count as the boundary.
  const idxA = a.indexOf("\n<turn_state>");
  const idxB = b.indexOf("\n<turn_state>");
  assert.ok(idxA > 0, "the turn_state tag must exist in the assembled prompt");
  const prefixA = a.slice(0, idxA);
  const prefixB = b.slice(0, idxB);
  assert.equal(prefixA, prefixB, "the session_context half must not vary turn to turn");
  assert.ok(prefixA.includes("The Odin cutover is slipping"), "the intake note lives inside the stable prefix");
  assert.ok(prefixA.includes("Conversation vocabulary"), "the vocabulary block lives inside the stable prefix");
});

// Living plan (no dead wires P3): mid-run notes render into the turn_state half.
// Inert until P4 passes them from the session; the render contract lives here.
test("session notes render capped and defaulted, and never enter the cached prefix", () => {
  const none = build().filled;
  assert.ok(!none.includes("{{SESSION_NOTES}}"), "SESSION_NOTES placeholder must be filled");
  assert.ok(none.includes("(none yet)"), "no notes renders the default");
  const longText = "x".repeat(400);
  const withNotes = build({
    sessionNotes: [
      { text: "old note one", turn: 1 },
      { text: "old note two", turn: 1 },
      { text: "He keeps glancing at his phone.", turn: 2 },
      { text: longText, turn: 3 },
    ],
  }).filled;
  assert.ok(withNotes.includes("He keeps glancing at his phone."), "note text reaches the prompt");
  assert.ok(!withNotes.includes("old note one"), "only the last three notes ride along");
  assert.ok(!withNotes.includes("x".repeat(200)), "note text is capped");
  const idx = withNotes.indexOf("\n<turn_state>");
  assert.ok(withNotes.indexOf("He keeps glancing") > idx, "notes live after the cache boundary");
});
