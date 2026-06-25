// Offline pass/fail gates for golden regression scenarios (Priya Jun02+).

const fs = require("node:fs");
const path = require("node:path");
const { validateQuestionBeforeShow, startsWithBrokenFragment } = require("./question-validator.ts");
const { applyManagerBriefingPostProcess } = require("./reviewer");
const { isRelationalArc } = require("./relational-arcs.ts");
const { AXIS_IDS, AXIS_MIN, AXIS_MAX } = require("./axes.ts");
const { FOCUS_POINTS_FILE } = require("./paths.mts");

// Focus catalogue category lookup (id -> category) for the relational-arc gate.
const FOCUS_CATALOGUE = JSON.parse(
  fs.readFileSync(FOCUS_POINTS_FILE, "utf8")
);
const FOCUS_CATEGORY_BY_ID = new Map(
  (FOCUS_CATALOGUE.focus_points || []).map((fp) => [fp.id, fp.category])
);

// runFocusArcGate — for Bi-weekly check-in and Something feels off, every focus
// point must be a `wellbeing`/`topic` entry; a `competency` entry is a hard fail.
// Category is resolved from the catalogue by id (never trusting a passed-in
// field). Detection only: it never edits the model output. Returns a failures
// array (mirrors runManagerBriefingBans).
function runFocusArcGate(focusPoints, meetingType) {
  const failures = [];
  if (!isRelationalArc(meetingType)) return failures;
  const points = Array.isArray(focusPoints) ? focusPoints : [];
  for (const fp of points) {
    const id = fp && fp.id;
    if (!id) continue;
    if (FOCUS_CATEGORY_BY_ID.get(id) === "competency") {
      failures.push(`relational arc "${meetingType}" emitted competency focus point: ${id}`);
    }
  }
  return failures;
}

// runQuestionArcGate — same trust rule as runFocusArcGate, one layer down: in a
// relational arc no SERVED question may carry purpose "competency" (the Jun 10
// Maya bi-weeklies served a "trust you in that next role" readiness question).
// Purpose-field-based: prose-level evaluativeness on a mislabelled question is
// the judge's job. Detection only — the input filters live in
// question-generator/queue-manager.
function runQuestionArcGate(transcript, meetingType) {
  const failures = [];
  if (!isRelationalArc(meetingType)) return failures;
  for (const t of transcript || []) {
    const q = t?.question;
    if (q && q.purpose === "competency") {
      failures.push(
        `relational arc "${meetingType}" served competency question: ${q.alias || q.name}`
      );
    }
  }
  return failures;
}

// runRoleProfileArcGate — for relational arcs, the rendered role-profile block
// must contain no competency-tagged item (same trust rule as runFocusArcGate:
// evaluative content reads as a hidden performance review). Pure render check
// over a profile doc — detection only, never edits.
function runRoleProfileArcGate(profileDoc, meetingType) {
  const failures = [];
  if (!isRelationalArc(meetingType)) return failures;
  if (!profileDoc || !profileDoc.profile) return failures;
  const { renderRoleProfileBlock } = require("./role-profile");
  const rendered = renderRoleProfileBlock(profileDoc, { slice: "full", meetingType });
  const competencyTexts = [
    ...(profileDoc.profile.known_challenges || [])
      .filter((c) => c && c.category === "competency")
      .map((c) => c.text),
    ...(profileDoc.profile.recommended_question_themes || [])
      .filter((t) => t && t.category === "competency")
      .map((t) => t.theme),
  ];
  for (const text of competencyTexts) {
    if (text && rendered.includes(text)) {
      failures.push(
        `relational arc "${meetingType}" rendered competency role-profile item: ${text.slice(0, 60)}`
      );
    }
  }
  return failures;
}

// Role-profile scaffolding is engine vocabulary — it must never surface in
// briefing prose (same spirit as MANAGER_BRIEFING_BANS).
const ROLE_PROFILE_VOCAB_BANS = [
  "role profile",
  "role_profile",
  "known_challenges",
  "recommended_question_themes",
  "listen_for",
  "role_confidence",
];

function runRoleProfileVocabLeak(briefing) {
  const text = collectBriefingText(briefing).toLowerCase();
  const failures = [];
  for (const ban of ROLE_PROFILE_VOCAB_BANS) {
    if (text.includes(ban)) {
      failures.push(`manager briefing contains role-profile scaffolding: ${ban}`);
    }
  }
  return failures;
}

// Plain-language backstop — business jargon observed leaking into manager-
// facing output (Jun 11 Machar run: "air cover" in the prep brief and in a
// generated question). Minimal by design: grows only from observed leaks,
// never speculatively. "bandwidth" is deliberately absent — the prep prompt
// itself recommends opening on "pace or bandwidth", so banning it would make
// the validator fight the prompt.
const JARGON_PATTERNS = [
  /\bair cover\b/i,
  /\bcircle back\b/i,
  /\bleverage\b/i,
  /\bsynergy\b/i,
];

// Returns the first jargon term found in `text`, or null.
function findJargon(text) {
  for (const re of JARGON_PATTERNS) {
    const m = String(text || "").match(re);
    if (m) return m[0];
  }
  return null;
}

// Vocabulary from retired prompt examples / other scenarios that has leaked
// across runs verbatim (Jun 02-04: the plan-turn "retry logic" example was
// served to a designer, a service designer and a UX lead). A served question
// may use these words only if this session said them first — note or an
// earlier answer; the question's own echo doesn't count. Grows from observed
// leaks only, like JARGON_PATTERNS.
const CROSS_SESSION_VOCAB = [/\bretry logic\b/i, /\bbilling rewrite\b/i];

// Post-hoc grounding audit: a served planner-written question that cites a
// `grounding` quote must have that quote in the session's own record (note +
// what was asked/answered before it). Detection only — the blocking gate
// lives in reconcileQueue; this catches anything that slipped past it.
function runQuestionGroundingChecks(transcript, managerNotes) {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const failures = [];
  let saidSoFar = norm(managerNotes);
  for (const t of transcript || []) {
    const q = t?.question;
    const g = norm(q?.grounding);
    if (g && g !== "open") {
      const tokens = g.split(" ").filter((w) => w.length > 3);
      const ok = saidSoFar.includes(g) || (tokens.length > 0 && tokens.every((w) => saidSoFar.includes(w)));
      if (!ok) {
        failures.push(`turn ${t?.turn}: grounding quote not found in session record: "${q.grounding}"`);
      }
    }
    saidSoFar += " " + norm(`${q?.name || ""} ${t?.answer || ""}`);
  }
  return failures;
}

// runStageTagOrphanCheck — every question tagged with a phase (stage) id must
// point at a stage a live arc actually has. An unknown tag doesn't error today;
// it silently sorts to the end of the intro queue (index 999 in intro-queue.js).
// Intro questions are folder-scoped to their meeting type, so their stage must be
// in THAT type's arc; openers are type-agnostic, so their stage must be in SOME
// type's arc. Detection only — offline, no model calls.
function runStageTagOrphanCheck() {
  const fsLocal = require("node:fs");
  const pathLocal = require("node:path");
  const questions = require("./questions.ts");
  const { listTypes, listStageIds } = require("./one-on-one-types");
  const failures = [];

  const allStageIds = new Set();
  for (const t of listTypes()) {
    const ids = listStageIds(t.slug);
    ids.forEach((id) => allStageIds.add(id));
    const idSet = new Set(ids);
    for (const q of questions.loadDir(pathLocal.join("_intro", t.slug))) {
      if (q.stage && !idSet.has(q.stage)) {
        failures.push(
          `intro question "${q.alias || q.name}" (${t.slug}) tagged to unknown stage "${q.stage}"`
        );
      }
    }
  }

  let openers = [];
  try {
    openers = JSON.parse(
      fsLocal.readFileSync(pathLocal.join(questions.QUESTIONS_ROOT, "_openers.json"), "utf8")
    );
  } catch {
    openers = [];
  }
  for (const o of Array.isArray(openers) ? openers : []) {
    if (o && o.stage && !allStageIds.has(o.stage)) {
      failures.push(`opener "${o.alias || o.id || o.name}" tagged to unknown stage "${o.stage}"`);
    }
  }
  return failures;
}

function runCrossSessionLeakCheck(transcript, managerNotes) {
  const failures = [];
  let saidSoFar = String(managerNotes || "");
  for (const t of transcript || []) {
    const name = String(t?.question?.name || "");
    for (const re of CROSS_SESSION_VOCAB) {
      const m = name.match(re);
      if (m && !re.test(saidSoFar)) {
        failures.push(
          `turn ${t?.turn}: question references "${m[0]}" which this session never mentioned`
        );
      }
    }
    saidSoFar += "\n" + String(t?.answer || "");
  }
  return failures;
}

const MANAGER_BRIEFING_BANS = [
  "bad follow-up",
  "planner",
  "sero",
  "tester",
  "product qa",
  "system diagnostics",
  "hought",
  // Flat HR labels — only the unambiguous ones. "burned out"/"disengaged" are
  // NOT banned: they are legitimate when quoting transcript evidence. These
  // three only ever read as a verdict, never as a quote, in briefing prose.
  "flight risk",
  "doesn't care",
  "does not care",
];

const WELLBEING_DISTRESS_MEANING =
  /\b(stress|burnout|overload|overwhelmed|anxious|anxiety|exhausted|distress|mental health)\b/i;

const WELLBEING_TRANSCRIPT_EVIDENCE =
  /\b(stress|stressed|burnout|burned out|overwhelmed|anxious|exhausted|can't cope|struggling emotionally|low energy|depressed)\b/i;

const GROWTH_VERY_WEAK = /\bvery weak\b/i;

// Burnout-trajectory framing that only appears in final-evaluation.md's
// wellbeing rules as "do not use" examples — never something a manager types.
// When one shows up in a shipped axis meaning, the model copied the rule
// vocabulary instead of describing this session (the "rushed handoffs and
// timelines" phrase appeared verbatim across 6+ Jun runs). Detection only.
const RULE_ECHO_PHRASES = [
  /\brushed handoffs and timelines\b/i,
  /\brunning hot\b/i,
  /\bdrift(?:ing)? toward burnout\b/i,
  /\bmasked fatigue\b/i,
  /\bload is rising\b/i,
];

// Axis ids whose meaning echoes rule-example framing. Shared by the trust gate
// (warning) and the runtime confidence downgrade in reviewer.js.
function ruleEchoAxisIds(briefing) {
  const ids = new Set();
  for (const ax of briefing?.axes || []) {
    if (RULE_ECHO_PHRASES.some((re) => re.test(ax?.meaning || ""))) ids.add(ax.id);
  }
  return ids;
}

function runMeaningRuleEchoCheck(briefing) {
  return [...ruleEchoAxisIds(briefing)].map(
    (id) => `axis ${id} meaning echoes rule-example framing, not this session's words`
  );
}

function collectBriefingText(briefing) {
  const parts = [
    briefing?.headline,
    briefing?.understanding_paragraph,
    briefing?.brutal_truth_employee,
    briefing?.brutal_truth_manager,
    ...(briefing?.summary_bullets || []),
    ...(briefing?.watch_for || []),
    ...(briefing?.next_actions || []).map((a) => a?.action),
    ...(briefing?.axes || []).map((a) => a?.meaning),
  ];
  return parts.filter(Boolean).join("\n");
}

function runManagerBriefingBans(briefing) {
  const text = collectBriefingText(briefing).toLowerCase();
  const failures = [];
  for (const ban of MANAGER_BRIEFING_BANS) {
    const re = ban === "hought" ? /\bhought\b/i : new RegExp(ban.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) failures.push(`manager briefing contains banned phrase: ${ban}`);
  }
  if (/^\s*thought retry logic\b/m.test(collectBriefingText(briefing))) {
    failures.push("manager briefing uses thought retry logic as question stem");
  }
  return failures;
}

function transcriptAnswers(transcript) {
  return (transcript || []).map((t) => String(t?.answer || "")).join("\n");
}

function runWellbeingMeaningCheck(briefing, transcript) {
  const failures = [];
  const answers = transcriptAnswers(transcript);
  const hasEvidence = WELLBEING_TRANSCRIPT_EVIDENCE.test(answers);
  for (const ax of briefing?.axes || []) {
    if (ax.id !== "wellbeing") continue;
    const meaning = ax.meaning || "";
    const negatedDistress =
      /\b(no|not enough|weak)\b.*\b(distress|stress|burnout)\b/i.test(meaning) ||
      /mostly a clarity/i.test(meaning) ||
      /weak wellbeing signal/i.test(meaning);
    if (WELLBEING_DISTRESS_MEANING.test(meaning) && !hasEvidence && !negatedDistress) {
      failures.push(
        "wellbeing meaning claims distress without direct transcript evidence"
      );
    }
  }
  return failures;
}

function transcriptShowsLearningCommitment(transcript) {
  const joined = transcriptAnswers(transcript).toLowerCase();
  const hasMiss = /\b(missed|wrong|assumption|failed|did not)\b/.test(joined);
  const hasCause = /\b(because|retry|edge case|logic|escalat)\b/.test(joined);
  const hasCommit =
    /\b(will|before handoff|checklist|commit|differently|going to)\b/.test(joined);
  return hasMiss && hasCause && hasCommit;
}

function runGrowthMeaningCheck(briefing, transcript) {
  const failures = [];
  if (!transcriptShowsLearningCommitment(transcript)) return failures;
  for (const ax of briefing?.axes || []) {
    if (ax.id !== "growth") continue;
    if (GROWTH_VERY_WEAK.test(ax.meaning || "")) {
      failures.push(
        'growth meaning says "very weak" despite miss+cause+commitment in transcript'
      );
    }
  }
  return failures;
}

function runEvalIntegrityChecks(briefing, axisState, transcript, { requireStateMatch = true } = {}) {
  const failures = [];
  const allText = collectBriefingText(briefing).toLowerCase();
  if (allText.includes("off-scale")) {
    failures.push('briefing contains "off-scale"');
  }
  for (const ax of briefing?.axes || []) {
    const score = ax.score;
    if (typeof score !== "number" || score < AXIS_MIN || score > AXIS_MAX) {
      failures.push(`axis ${ax.id} score ${score} outside [${AXIS_MIN}, ${AXIS_MAX}]`);
    }
    if (requireStateMatch && axisState?.[ax.id]) {
      const expected = axisState[ax.id].score;
      if (score !== expected) {
        failures.push(`axis ${ax.id} score ${score} !== axis_state ${expected}`);
      }
    }
  }
  failures.push(...runWellbeingMeaningCheck(briefing, transcript));
  failures.push(...runGrowthMeaningCheck(briefing, transcript));
  return failures;
}

// runAxisSilenceCheck — a session full of real signal must read SOMETHING.
// If ≥4 substantive answers came in and the shipped briefing still marks every
// axis not_read, the axis layer failed, it isn't honesty (the Jun 06-07 sweeps
// shipped whole sessions "didn't come up"). A genuinely thin session stays
// exempt via the substantive-answer floor.
function runAxisSilenceCheck(briefing, transcript) {
  const substantive = (transcript || []).filter((t) => {
    if (t?.skipped) return false;
    const a = String(t?.answer || "").trim();
    return a && a !== "(skipped)" && a.split(/\s+/).length >= 5;
  }).length;
  if (substantive < 4) return [];
  const axes = Array.isArray(briefing?.axes) ? briefing.axes : [];
  if (!axes.length) return [];
  const allSilent = axes.every((ax) => ax?.read_status === "not_read");
  return allSilent
    ? [`every axis shipped not_read despite ${substantive} substantive answers — axis layer never engaged`]
    : [];
}

function runQuestionStemChecks(transcript) {
  const failures = [];
  for (const t of transcript || []) {
    const name = t?.question?.name || "";
    const answer = t?.answer || "";
    if (startsWithBrokenFragment(name)) {
      failures.push(`transcript turn ${t.turn}: broken question stem: ${name.slice(0, 60)}`);
    }
    if (/^thought retry logic\b/i.test(name) && !/^when you assumed/i.test(name)) {
      failures.push(`transcript turn ${t.turn}: banned note shorthand stem`);
    }
    const v = validateQuestionBeforeShow({ name, answer, transcript });
    if (!v.ok && t?.question?.alias?.includes("thread_follow")) {
      failures.push(
        `transcript turn ${t.turn}: thread-follow would be rejected (${v.reason})`
      );
    }
  }
  return failures;
}

function runQualityPrepListenFor(brief, selectedFocus) {
  if (normalizeFocusId(selectedFocus) !== "quality") return [];
  const items = brief?.listenFor || [];
  if (!items.length) return ["listenFor empty for quality focus"];
  const qualityCue =
    /\b(handoff|edge case|escalat|release|review|dependency|defect|QA|test coverage|payment|launch)\b/i;
  const commOnly =
    /\b(stakeholder confusion|communication challenges|reviewer churn|second read)\b/i;
  let qualityHits = 0;
  let commOnlyHits = 0;
  for (const item of items) {
    if (qualityCue.test(item)) qualityHits += 1;
    if (commOnly.test(item) && !qualityCue.test(item)) commOnlyHits += 1;
  }
  const failures = [];
  if (qualityHits < Math.ceil(items.length / 2)) {
    failures.push("listenFor not majority quality/backend tells for quality focus");
  }
  if (commOnlyHits >= Math.ceil(items.length / 2)) {
    failures.push("listenFor drifts to communication-only for quality focus");
  }
  return failures;
}

function normalizeFocusId(selectedFocus) {
  return String(selectedFocus?.id || "").trim().toLowerCase();
}

function runGoldenScenarioChecks(scenario) {
  const g = scenario.golden;
  if (!g) return { failures: [], passes: [] };

  let failures = [];
  const passes = [];

  const transcript = g.transcript || scenario.golden_transcript;
  const axisState = g.axis_state || scenario.golden_axis_state;

  if (g.expectTranscriptStemFailures) {
    const stemFails = runQuestionStemChecks(transcript);
    if (stemFails.length) {
      passes.push(`expected transcript stem failures (${stemFails.length})`);
    } else {
      failures.push("expected transcript to fail stem checks (Jun02 bad follow-up)");
    }
  } else {
    failures.push(...runQuestionStemChecks(transcript));
  }

  const badEval = g.golden_eval_bad;
  if (badEval) {
    const banFails = runManagerBriefingBans(badEval);
    if (banFails.length) {
      passes.push(`golden_eval_bad fails manager bans (${banFails.length})`);
    } else {
      failures.push("golden_eval_bad should fail manager briefing bans");
    }
    const scoreFails = runEvalIntegrityChecks(badEval, axisState, transcript, {
      requireStateMatch: false,
    });
    if (scoreFails.some((f) => f.includes("clarity") || f.includes("off-scale"))) {
      passes.push("golden_eval_bad fails score integrity");
    }
  }

  if (g.golden_eval_bad && axisState) {
    const processed = applyManagerBriefingPostProcess(
      JSON.parse(JSON.stringify(g.golden_eval_bad)),
      axisState,
      transcript
    );
    const scoreOnly = runEvalIntegrityChecks(processed, axisState, transcript, {
      requireStateMatch: true,
    }).filter((f) => !f.includes("wellbeing") && !f.includes("growth") && !f.includes("off-scale"));
    if (scoreOnly.length === 0) {
      passes.push("post-process fixes axis scores to match axis_state");
    } else {
      failures.push(...scoreOnly.map((f) => `post-process: ${f}`));
    }
  }

  if (g.expectPostProcessedPass && g.golden_eval_good) {
    const goodFails = [
      ...runManagerBriefingBans(g.golden_eval_good),
      ...runEvalIntegrityChecks(g.golden_eval_good, axisState, transcript, {
        requireStateMatch: true,
      }),
    ];
    if (goodFails.length) {
      failures.push(...goodFails.map((f) => `golden_eval_good: ${f}`));
    } else {
      passes.push("golden_eval_good passes manager gates");
    }
  }

  if (g.telegraphic_answer) {
    const built = `${g.telegraphic_answer.split(/\s+/).slice(0, 3).join(" ")} — can you say more about what that means for you right now?`;
    const v = validateQuestionBeforeShow({
      name: built,
      answer: g.telegraphic_answer,
      transcript,
    });
    if (!v.ok) {
      passes.push("telegraphic mirror stem rejected by validator");
    } else {
      failures.push("telegraphic mirror stem should be rejected");
    }
  }

  return { failures, passes };
}

module.exports = {
  AXIS_MIN,
  AXIS_MAX,
  AXIS_IDS,
  MANAGER_BRIEFING_BANS,
  JARGON_PATTERNS,
  findJargon,
  collectBriefingText,
  runManagerBriefingBans,
  runCrossSessionLeakCheck,
  runStageTagOrphanCheck,
  runQuestionGroundingChecks,
  runFocusArcGate,
  runQuestionArcGate,
  runAxisSilenceCheck,
  runMeaningRuleEchoCheck,
  ruleEchoAxisIds,
  runRoleProfileArcGate,
  runRoleProfileVocabLeak,
  runEvalIntegrityChecks,
  runQuestionStemChecks,
  runQualityPrepListenFor,
  runGoldenScenarioChecks,
  runWellbeingMeaningCheck,
  runGrowthMeaningCheck,
};
