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

// --- prep freshness threading (better-reads Phase 3) ------------------------
// The prompt placeholder isn't in preparation.md yet (that edit waits on the
// content/prompts lane), so today the block must be a no-op on the assembled
// prompt — and the arc fence must already hold in buildPrepInput.
import { buildPrepInput, assemblePreparation } from "./preparation.ts";

const perfPrior = {
  when: 1750000000000,
  meetingType: "Performance review",
  coreIssue: "perf framing",
  openingQuestion: "perf opener",
};
const relPrior = { ...perfPrior, meetingType: "Bi-weekly check-in" };

test("buildPrepInput: relational meeting drops a non-relational prior brief", () => {
  const out = buildPrepInput({ meetingType: "Bi-weekly check-in", prepHistory: perfPrior } as never) as { prepHistory: unknown };
  assert.equal(out.prepHistory, null);
});

test("buildPrepInput: relational meeting keeps a relational prior brief", () => {
  const out = buildPrepInput({ meetingType: "Bi-weekly check-in", prepHistory: relPrior } as never) as { prepHistory: unknown };
  assert.deepEqual(out.prepHistory, relPrior);
});

test("assemblePreparation: prior brief renders in the prompt's User half; sentinel without one", () => {
  const base = { name: "A", role: "UX Lead", seniority: "Lead", meetingType: "Bi-weekly check-in", notes: "steady fortnight" };
  const without = assemblePreparation(base as never).prompt;
  assert.ok(without.includes("(first prep for this person — no prior brief)"));
  const withHistory = assemblePreparation({ ...base, prepHistory: relPrior } as never).prompt;
  assert.ok(withHistory.includes("Core issue then: perf framing"));
  assert.ok(withHistory.includes("Opener then: perf opener"));
  // Cache safety: the System half must be byte-identical either way — the
  // block lives in the User half only.
  const sys = (p: string) => p.split(/\n## User/)[0];
  assert.equal(sys(withHistory), sys(without));
});
