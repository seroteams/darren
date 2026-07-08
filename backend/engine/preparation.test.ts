import test from "node:test";
import assert from "node:assert/strict";
import { validateBrief } from "./preparation.ts";

// The brief-validator's listenFor cue check (C3) flags an item as "may lack
// observable behavioural cue" unless it contains one of a whitelist of words.
// CTOCheckJuly found the whitelist had singular "meeting", so \bmeeting\b missed
// "meetings" — a good listen-for mentioning meetings was wrongly flagged.

const baseInputs = {
  name: "Carl",
  roleTitle: "UX Lead",
  seniority: "Lead",
  meetingType: "Bi-weekly check-in",
  observedShift: "always late",
  focusPoints: [],
  selectedFocus: null,
};

function briefWith(listenFor: string[]) {
  return {
    coreIssue: "Carl's late starts may be a capacity issue this fortnight.",
    openingQuestion: "How have the last couple of weeks felt in terms of pace?",
    listenFor,
    avoid: ["do not accuse Carl of being unreliable", "do not jump straight to fixes"],
    goodOutcome: "You and Carl agree one lead-level change to his working pattern.",
    suggestedAction: "During the 1:1, ask Carl to walk through a typical late-start day.",
    confidence: "Medium — based on your note about a repeated pattern",
    dontAssume: "That Carl is careless: late starts alone do not tell you why.",
  };
}

function cueIssues(listenFor: string[]) {
  return validateBrief(briefWith(listenFor) as never, baseInputs as never).issues.filter((i) =>
    i.includes("may lack observable behavioural cue"),
  );
}

test("validateBrief: a listenFor mentioning 'meetings' counts as a behavioural cue", () => {
  assert.deepEqual(
    cueIssues([
      "whether he names a specific late-start example",
      "whether he mentions a recent week",
      "whether he links his mornings to meetings and workload",
    ]),
    [],
  );
});

test("validateBrief: 'stakeholders' and 'projects' (plural) count as behavioural cues", () => {
  assert.deepEqual(
    cueIssues([
      "whether he links progress to the stakeholders waiting on him",
      "whether he ties his week to the projects that slipped",
      "whether he mentions a recent week",
    ]),
    [],
  );
});

test("validateBrief: a cue-less listenFor is still flagged (fix didn't weaken the check)", () => {
  const issues = cueIssues([
    "whether he is happy",
    "whether he is fine",
    "whether he is good",
  ]);
  assert.ok(issues.length >= 1, "expected a 'may lack observable behavioural cue' flag");
});
