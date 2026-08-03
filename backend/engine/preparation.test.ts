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
    avoid: ["Do not accuse Carl of being unreliable.", "Do not jump straight to fixes."],
    goodOutcome: "You and Carl agree one lead-level change to his working pattern.",
    suggestedAction: "During the 1:1, ask Carl to walk through a typical late-start day.",
    confidence: "Medium — based on your note about a repeated pattern",
    dontAssume: "That Carl is careless: late starts alone do not tell you why.",
    styleTip: "Keep this a light rhythm-keeper — open on how the fortnight felt before you touch the late starts.",
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

// --- C3/C3b: one pronoun for the report, across all three tells --------------
// A live brief for "Priya" said "whether she names ...", "whether she volunteers
// ...", then "if they mention ...". The old prefix rule required the opener to be
// "whether" or "if they", so the third item's pronoun was forced by the grammar,
// not chosen. The opener is now plain "if", and mixing is flagged.

function prefixIssues(listenFor: string[]) {
  return validateBrief(briefWith(listenFor) as never, baseInputs as never).issues.filter((i) =>
    i.includes('must start with "whether" or "if"'),
  );
}
function pronounIssues(listenFor: string[]) {
  return validateBrief(briefWith(listenFor) as never, baseInputs as never).issues.filter((i) =>
    i.includes("mixes pronouns"),
  );
}

test("validateBrief: 'if she ...' is a legal opener, not just 'if they ...'", () => {
  assert.deepEqual(
    prefixIssues([
      "whether she names a specific late-start example",
      "if she mentions a recent week",
      "if they name the meetings that crowd her mornings",
    ]),
    [],
  );
});

test("validateBrief: an opener that is neither 'whether' nor 'if' is still flagged", () => {
  assert.ok(prefixIssues(["does he name a specific late-start example"]).length >= 1);
});

test("validateBrief: mixing she and they across the tells is flagged", () => {
  const issues = pronounIssues([
    "whether she names a specific change in how work gets assigned",
    "whether she volunteers where review timing has gotten stuck",
    "if they mention payments work as a deliberate tradeoff",
  ]);
  assert.equal(issues.length, 1, "one flag naming the mix");
  assert.ok(issues[0]?.includes("she/they"), `expected the mixed pair named, got: ${issues[0]}`);
});

test("validateBrief: one consistent pronoun passes, whichever it is", () => {
  for (const p of [
    ["whether she names a specific change", "whether she volunteers a recent week", "if she mentions the projects that slipped"],
    ["whether he names a specific change", "whether he volunteers a recent week", "if he mentions the projects that slipped"],
    ["whether they name a specific change", "whether they volunteer a recent week", "if they mention the projects that slipped"],
  ]) {
    assert.deepEqual(pronounIssues(p), [], `expected no flag for: ${p[0]}`);
  }
});

test("validateBrief: tells with no pronoun subject are left alone", () => {
  assert.deepEqual(
    pronounIssues([
      "whether the handoff notes name a specific dependency",
      "if review timing comes up before you raise it",
      "whether the projects that slipped get a concrete cause",
    ]),
    [],
  );
});

// styleTip clause — a real, on-style line that isn't just a restatement of the
// core issue. Filters to styleTip-specific issues so unrelated fixture drift
// can't mask the assertion.
const goodListenFor = [
  "whether he names a specific late-start example",
  "whether he mentions a recent week",
  "whether he links his mornings to meetings and workload",
];
function styleTipIssues(styleTip: string) {
  return validateBrief({ ...briefWith(goodListenFor), styleTip } as never, baseInputs as never).issues.filter(
    (i) => i.toLowerCase().includes("styletip"),
  );
}

test("validateBrief: a good styleTip passes the styleTip clause", () => {
  assert.deepEqual(
    styleTipIssues("Keep this a light rhythm-keeper — ask how the fortnight felt before the late starts."),
    [],
  );
});

test("validateBrief: a missing styleTip is flagged", () => {
  assert.ok(styleTipIssues("").some((i) => i.includes("missing or too short")));
});

test("validateBrief: a styleTip that just restates coreIssue is flagged", () => {
  assert.ok(
    styleTipIssues(briefWith(goodListenFor).coreIssue).some((i) => i.includes("must not restate coreIssue")),
  );
});

// --- prep freshness threading (better-reads Phase 3) ------------------------
// The prior brief rides in the prompt's User half, and the arc fence holds in
// buildPrepInput before it ever gets there.
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
  const withHistory = assemblePreparation({ ...base, prepHistory: { ...relPrior, confidence: "Low — defaults only." } } as never).prompt;
  // Provenance (audit D16): the prior brief arrives labelled as the engine's
  // hypothesis at its recorded confidence — never as flat fact.
  assert.ok(withHistory.includes("the engine's hypothesis then, not established fact"));
  assert.ok(withHistory.includes("Core issue it proposed (confidence: low): perf framing"));
  assert.ok(withHistory.includes("Opener it suggested: perf opener"));
  // Cache safety: the System half must be byte-identical either way — the
  // block lives in the User half only.
  const sys = (p: string) => p.split(/\n## User/)[0];
  assert.equal(sys(withHistory), sys(without));
});

// --- C6: sentence case across every field ------------------------------------
// Carl, 2026-07-29: the Machar brief rendered "Listen for" as three lowercase
// fragments with no full stops beside cards that were written sentences, so the
// capitalisation read as an accident. One rule now covers every field and every
// list item (docs/reference/copy-rules.md).

function caseIssues(brief: Record<string, unknown>) {
  return validateBrief({ ...briefWith(SENTENCE_TELLS), ...brief } as never, baseInputs as never).issues.filter(
    (i) => /must start with a capital|must end with a full stop|shouts in capitals/.test(i),
  );
}

const SENTENCE_TELLS = [
  "Whether he names a specific late-start example.",
  "Whether he mentions a recent week.",
  "Whether he links his mornings to meetings and workload.",
];

test("validateBrief: a fully sentence-cased brief raises no capitalisation issue", () => {
  assert.deepEqual(caseIssues({}), []);
});

test("validateBrief: a lowercase listenFor item is flagged", () => {
  const issues = caseIssues({ listenFor: ["whether he names a specific late-start example.", ...SENTENCE_TELLS.slice(1)] });
  assert.ok(issues.some((i) => i.includes("listenFor[0] must start with a capital")));
});

test("validateBrief: a listenFor item with no full stop is flagged", () => {
  const issues = caseIssues({ listenFor: ["Whether he names a specific late-start example", ...SENTENCE_TELLS.slice(1)] });
  assert.ok(issues.some((i) => i.includes("listenFor[0] must end with a full stop")));
});

test("validateBrief: a lowercase avoid item is flagged, sentence case is not", () => {
  assert.ok(
    caseIssues({ avoid: ["do not accuse Carl of being unreliable.", "Do not jump straight to fixes."] }).some((i) =>
      i.includes("avoid[0] must start with a capital"),
    ),
  );
  assert.deepEqual(
    caseIssues({ avoid: ["Do not accuse Carl of being unreliable.", "Do not jump straight to fixes."] }),
    [],
  );
});

test("validateBrief: shouting in a sentence field is flagged", () => {
  const issues = caseIssues({ coreIssue: "Carl's late starts are the ONLY thing to settle this fortnight." });
  assert.ok(issues.some((i) => i.includes("coreIssue shouts in capitals")));
});

test("validateBrief: a question mark closes openingQuestion, and 1:1 is not shouting", () => {
  assert.deepEqual(
    caseIssues({ openingQuestion: "How have the last couple of weeks felt in this 1:1 cadence?" }),
    [],
  );
});

// --- C3 cue check: verb conjugation + tells observed in real briefs ----------
// July 2026 cost leak: every run paid for a validation retry, and 53 shipped
// briefs were still flagged "may lack observable behavioural cue". The flagged
// items WERE behavioural tells — the whitelist only knew third-person-singular
// forms ("volunteers"), so the they/them items the prompt itself mandates
// ("if they volunteer") could never pass, and common observable verbs the model
// reaches for (points to, brings up, asks for, talks about) were absent.
// Fixtures below are from logs/july run briefs.

test("validateBrief: they/them tells count — 'they volunteer' equals 'she volunteers'", () => {
  assert.deepEqual(
    cueIssues([
      "Whether they volunteer a recent example where proving partner value took more time than expected.",
      "If they describe work as flowing through them by default rather than by explicit ask.",
      "Whether they mention a partner conversation that ran long.",
    ]),
    [],
  );
});

test("validateBrief: points to / asks for / brings up / talks about are behavioural cues", () => {
  assert.deepEqual(
    cueIssues([
      "Whether she points to missing edge cases, weak rationale, or unclear tradeoffs in the review notes.",
      "Whether he asks for a decision, cover, or clearer priority from you.",
      "Whether she brings up tradeoffs between review work, her own delivery, and mentoring.",
    ]),
    [],
  );
  assert.deepEqual(
    cueIssues([
      "Whether he talks about the busier pace as a short spike or as the new normal.",
      "Whether she raises the billing rewrite before you do.",
      "If he frames next quarter around one system area he expects to own.",
    ]),
    [],
  );
});

test("validateBrief: paraphrase block-list catches plural forms too", () => {
  const issues = validateBrief(briefWith([
    "If they acknowledge the feedback from design.",
    ...SENTENCE_TELLS.slice(1),
  ]) as never, baseInputs as never).issues.filter((i) => i.includes("paraphrases focus"));
  assert.equal(issues.length, 1);
});

// --- Meeting-type reflection: the register words the prompt teaches count ----
// Second-biggest retry driver (28 shipped briefs flagged). For a bi-weekly the
// validator wanted check/routine/regular/cadence/weekly, but the prompt coaches
// the opener toward "since we last spoke" / "last couple of weeks" / "this
// fortnight" — so a brief written exactly as instructed failed the check.

function meetingTypeIssues(overrides: Record<string, unknown>, inputs: Record<string, unknown> = {}) {
  return validateBrief(
    { ...briefWith(SENTENCE_TELLS), ...overrides } as never,
    { ...baseInputs, ...inputs } as never,
  ).issues.filter((i) => i.includes("meeting type"));
}

test("validateBrief: bi-weekly phrased in the prompt's own register passes the meeting-type check", () => {
  // briefWith's coreIssue says "this fortnight" and the opener "the last couple
  // of weeks" — the exact phrasing preparation.md recommends for a bi-weekly.
  assert.deepEqual(meetingTypeIssues({}), []);
});

test("validateBrief: a bi-weekly brief with no cadence signal is still flagged", () => {
  const issues = meetingTypeIssues({
    coreIssue: "Carl's late starts are draining his mornings.",
    openingQuestion: "What is taking most of your energy right now?",
  });
  assert.equal(issues.length, 1);
});

test("validateBrief: 'last couple of sprints' locates the bi-weekly stretch too", () => {
  assert.deepEqual(
    meetingTypeIssues({
      coreIssue: "Darryl likely needs a sharper sequence from beta test to live date after recent slips.",
      openingQuestion: "How is the path from beta test to a live date looking after the last couple of sprints?",
    }),
    [],
  );
});

// --- C4 goodOutcome level check: same lexical-gap class, seen on Darryl runs --
// "Engineering manager, app build" split on whitespace kept the comma, so
// "manager," could never match the outcome text; and "owner-level" (a genuine
// level artefact) was not on the marker list. Both flagged real level-specific
// outcomes and fed the retry.

function outcomeIssues(goodOutcome: string, roleTitle: string) {
  return validateBrief(
    { ...briefWith(SENTENCE_TELLS), goodOutcome } as never,
    { ...baseInputs, roleTitle, seniority: "Mid-level" } as never,
  ).issues.filter((i) => i.includes("goodOutcome"));
}

test("validateBrief: a role word reaches the outcome even when the title has a comma", () => {
  assert.deepEqual(
    outcomeIssues(
      "You and Darryl have agreed how he will run the beta as manager for this app build.",
      "Engineering manager, app build",
    ),
    [],
  );
});

test("validateBrief: 'owner-level' counts as a level marker", () => {
  assert.deepEqual(
    outcomeIssues(
      "You and Darryl have agreed the one delivery owner-level call he will make this fortnight.",
      "Engineering role",
    ),
    [],
  );
});

test("validateBrief: a genuinely level-free goodOutcome is still flagged", () => {
  const issues = outcomeIssues(
    "You and Carl have agreed one concrete next step to talk again soon.",
    "Engineering role",
  );
  assert.equal(issues.length, 1);
});

test("validateBrief: performance brief naming delivery and expectations passes the meeting-type check", () => {
  assert.deepEqual(
    meetingTypeIssues(
      {
        coreIssue: "Tom may be delivering reliably, but his principal-level effect on the team is hard to see.",
        openingQuestion: "What work on this team do you see as yours to shape at principal scope?",
      },
      { meetingType: "Performance & feedback" },
    ),
    [],
  );
});

// ---- {{PRIOR_OUTCOME_BLOCK}} reaches the prompt ---------------------------------------
//
// A gate can be correct and completely inert. renderPriorOutcomeBlock is tested
// hard in prior-recap.test.ts; what these prove is that its output actually rides
// into the assembled prompt, and that the placeholder never survives unfilled.

const prepInputsWith = (priorRecap: unknown) => ({
  name: "Priya",
  roleTitle: "Product Designer",
  seniority: "Mid",
  meetingType: "Bi-weekly check-in",
  notes: "Quieter than usual in the last two stand-ups.",
  focusPoints: [],
  selectedFocus: null,
  priorRecap,
});

const RECAP = {
  sessionId: "run-1",
  when: Date.UTC(2026, 6, 20),
  meetingType: "Bi-weekly check-in",
  headline: "Flat because the review cycle eats two days a sprint with nobody owning it.",
  summaryMissing: false,
  agreedSource: "promises",
  agreed: [
    { owner: "manager", action: "Early context on the billing rewrite", outcome: "yes" },
    { owner: "report", action: "Draft the rota", outcome: "no" },
  ],
  axes: [
    { id: "wellbeing", score: -4, read: true },
    { id: "growth", score: null, read: false },
  ],
};

test("the assembled prep prompt carries what happened last time", () => {
  const { prompt } = assemblePreparation(prepInputsWith(RECAP) as never);
  assert.doesNotMatch(prompt, /\{\{PRIOR_OUTCOME_BLOCK\}\}/, "the placeholder was filled, not left raw");
  assert.match(prompt, /2026-07-20/);
  assert.match(prompt, /Flat because the review cycle/);
  assert.match(prompt, /you: Early context on the billing rewrite: done/);
  assert.match(prompt, /they: Draft the rota: not done/);
  assert.match(prompt, /wellbeing: -4, growth: not read/);
});

test("the prompt keeps the guess and the record apart, with opposite instructions", () => {
  const { prompt } = assemblePreparation(prepInputsWith(RECAP) as never);
  // The avoid-rule is scoped to the hypothesis block, and the record is told to be used.
  assert.match(prompt, /That avoid-rule covers the prior brief only/);
  assert.match(prompt, /The "do not repeat it" rule applies to the guess, never to the record/);
  // And the record block comes after the hypothesis block, so the scoping sentence reads forward.
  assert.ok(
    prompt.indexOf("{{PREP_HISTORY_BLOCK}}") === -1 &&
      prompt.indexOf("What actually happened last time") > prompt.indexOf("Last time's brief"),
  );
});

test("no prior run fills the sentinel rather than leaving a hole", () => {
  const { prompt } = assemblePreparation(prepInputsWith(null) as never);
  assert.doesNotMatch(prompt, /\{\{PRIOR_OUTCOME_BLOCK\}\}/);
  assert.match(prompt, /\(no finished 1:1 with this person yet\)/);
});

test("the record rides in the User half only, so the cached prefix never moves", () => {
  const sys = (p: string) => p.split(/\n## User/)[0];
  const withRecap = assemblePreparation(prepInputsWith(RECAP) as never).prompt;
  const without = assemblePreparation(prepInputsWith(null) as never).prompt;
  assert.equal(sys(withRecap), sys(without));
});

test("a relational meeting after a performance review keeps the facts, drops the framing", () => {
  const { prompt } = assemblePreparation(
    prepInputsWith({ ...RECAP, meetingType: "Performance & feedback" }) as never,
  );
  assert.doesNotMatch(prompt, /Flat because the review cycle/);
  assert.doesNotMatch(prompt, /wellbeing: -4/);
  assert.match(prompt, /you: Early context on the billing rewrite: done/);
});
