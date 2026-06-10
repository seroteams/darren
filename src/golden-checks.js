// Offline pass/fail gates for golden regression scenarios (Priya Jun02+).

const fs = require("node:fs");
const path = require("node:path");
const { validateQuestionBeforeShow, startsWithBrokenFragment } = require("./question-validator");
const { applyManagerBriefingPostProcess } = require("./reviewer");
const { isRelationalArc } = require("./relational-arcs");

// Focus catalogue category lookup (id -> category) for the relational-arc gate.
const FOCUS_CATALOGUE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "focus-points.json"), "utf8")
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

const AXIS_MIN = -10;
const AXIS_MAX = 10;
const AXIS_IDS = ["wellbeing", "engagement", "clarity", "growth"];

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
  collectBriefingText,
  runManagerBriefingBans,
  runFocusArcGate,
  runEvalIntegrityChecks,
  runQuestionStemChecks,
  runQualityPrepListenFor,
  runGoldenScenarioChecks,
  runWellbeingMeaningCheck,
  runGrowthMeaningCheck,
};
