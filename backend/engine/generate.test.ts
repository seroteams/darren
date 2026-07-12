// Focus-points prompt assembly (focus-freshness Phase 1) — destination checks
// on the exact prompt bytes assembleFocusPoints would send, no model call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleFocusPoints } from "./generate.ts";

const HISTORY = [
  {
    when: 1750000000000,
    meetingType: "Bi-weekly check-in",
    points: [
      { id: "workload", type: "Workload & capacity", category: "wellbeing", label: "Late nights — push or overload?" },
    ],
  },
  {
    when: 1750000000001,
    meetingType: "Performance & feedback",
    points: [{ id: "quality", type: "Quality", category: "competency", label: "Bug rate on launches" }],
  },
];

test("prompt for a repeat person carries the history block", () => {
  const { prompt } = assembleFocusPoints({
    name: "Priya",
    role: "Backend Engineer",
    seniority: "Senior",
    meetingType: "Bi-weekly check-in",
    notes: "all fine",
    focusHistory: HISTORY,
  });
  assert.match(prompt, /earlier 1:1 preps for Priya/);
  assert.match(prompt, /Workload & capacity/);
  assert.doesNotMatch(prompt, /\{\{FOCUS_HISTORY_BLOCK\}\}/);
});

test("relational prompt never carries competency history from a past review", () => {
  const { prompt } = assembleFocusPoints({
    meetingType: "Bi-weekly check-in",
    focusHistory: HISTORY,
  });
  assert.doesNotMatch(prompt, /Bug rate on launches/);
});

test("evaluative prompt keeps the full history", () => {
  const { prompt } = assembleFocusPoints({
    meetingType: "Performance & feedback",
    focusHistory: HISTORY,
  });
  assert.match(prompt, /Bug rate on launches/);
});

test("no history renders the first-session line — no dangling placeholder", () => {
  const { prompt } = assembleFocusPoints({ meetingType: "Bi-weekly check-in" });
  assert.match(prompt, /first session with this person/);
  assert.doesNotMatch(prompt, /\{\{FOCUS_HISTORY_BLOCK\}\}/);
});
