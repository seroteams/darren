// Deterministic trust checks for the regression gate.
//
// These are CODE rules, not model judgment — they decide the gate's hard
// pass/fail. The LLM judge (scripts/eval-judge.js) only adds advisory warnings
// on top; it never sets a hard verdict here.
//
// Reach is deliberately honest (see evals/README.md "Known limitations"):
//   - PRIVATE_NOTE_LEAK is a blatant-case tripwire (near-verbatim reuse only).
//   - OVERDIAGNOSIS_ON_THIN tests the engine's softening guardrail, not every
//     prose-level over-read.
// The reworded/subtle cases fall to the judge Warn and, later, the data-flow
// boundary fast-follow.

const { computeReadQuality } = require("../src/reviewer");
const { forbiddenPatternsFor, isDuplicateText } = require("../src/question-eligibility");
const {
  runManagerBriefingBans,
  runCrossSessionLeakCheck,
  runQuestionGroundingChecks,
  runFocusArcGate,
  runQuestionArcGate,
  runAxisSilenceCheck,
  runMeaningRuleEchoCheck,
  runRoleProfileArcGate,
  runRoleProfileVocabLeak,
  runEvalIntegrityChecks,
} = require("../src/golden-checks");
const { loadRoleProfile } = require("../src/role-profile");

const HARD_FAIL = {
  PRIVATE_NOTE_LEAK: "PRIVATE_NOTE_LEAK",
  OVERDIAGNOSIS_ON_THIN: "OVERDIAGNOSIS_ON_THIN",
  WRONG_MEETING_TYPE: "WRONG_MEETING_TYPE",
  ENGINE_VOCAB_LEAK: "ENGINE_VOCAB_LEAK",
  FOCUS_ARC_LEAK: "FOCUS_ARC_LEAK",
  QUESTION_ARC_LEAK: "QUESTION_ARC_LEAK",
  ROLE_PROFILE_ARC_LEAK: "ROLE_PROFILE_ARC_LEAK",
  ROLE_PROFILE_VOCAB_LEAK: "ROLE_PROFILE_VOCAB_LEAK",
  SCHEMA_INVALID: "SCHEMA_INVALID",
  QUESTION_INTEGRITY: "QUESTION_INTEGRITY",
  CROSS_SESSION_QUESTION_LEAK: "CROSS_SESSION_QUESTION_LEAK",
};

const REQUIRED_BRIEFING_KEYS = [
  "headline",
  "summary_bullets",
  "understanding_paragraph",
  "axes",
  "brutal_truth_employee",
  "brutal_truth_manager",
  "next_actions",
  "watch_for",
];

// Manager fields the employee never sees. Everything else in the briefing is
// employee-facing / shareable, so a private worry reaching any of those is a
// leak. brutal_truth_manager is the manager-only channel and is exempt.
const MANAGER_ONLY_FIELDS = new Set(["brutal_truth_manager"]);

// Words that flag a clause as the manager's private *judgment* (not a neutral
// observation). The leak check only fires when a judgment clause is reused — so
// a note like "just joined, shipped payments refactor" (pure observation) never
// trips it, but "I doubt he's ready to lead" does.
const JUDGMENT_MARKERS = [
  "doubt", "not sure", "unsure", "worried", "worry", "concern", "concerned",
  "readiness", "ready", "confidence", "confident", "insecure", "hesitant",
  "coasting", "checked out", "struggling", "weak", "lacking", "immature",
  "maturity", "not management material", "interviewing", "disengaged",
];
const MARKER_RE = new RegExp(
  `\\b(${JUDGMENT_MARKERS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i"
);

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "to", "for", "with",
  "is", "are", "was", "were", "be", "been", "has", "have", "had", "his", "her", "their", "they",
  "he", "she", "it", "i", "im", "ive", "that", "this", "about", "into", "at",
  "as", "by", "from", "still", "often", "but", "not",
]);

function contentWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w));
}

function ngramSet(words, n) {
  const out = new Set();
  for (let i = 0; i <= words.length - n; i += 1) {
    out.add(words.slice(i, i + n).join(" "));
  }
  return out;
}

// Concatenate every employee-facing briefing field (excludes brutal_truth_manager).
function employeeFacingText(briefing) {
  if (!briefing || typeof briefing !== "object") return "";
  const parts = [];
  const push = (v) => {
    if (typeof v === "string") parts.push(v);
  };
  for (const [key, value] of Object.entries(briefing)) {
    if (MANAGER_ONLY_FIELDS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") push(item);
        else if (item && typeof item === "object") {
          push(item.action);
          push(item.meaning);
        }
      }
    } else {
      push(value);
    }
  }
  return parts.join("\n");
}

// PRIVATE_NOTE_LEAK — blatant tripwire. Splits the manager notes into clauses,
// keeps the ones that read as private judgment, and flags if any reuses a run of
// 3 content words verbatim in the employee-facing output. Will miss rewordings
// (those are the judge's job).
function checkPrivateNoteLeak(managerNotes, briefing) {
  const employeeText = employeeFacingText(briefing);
  if (!managerNotes || !employeeText) return null;

  // Bigram of content words: catches near-verbatim reuse of a 2-word judgment
  // span (e.g. "ready to lead" → content words "ready lead") that a trigram
  // misses once stopwords collapse it. Marker-gating below keeps false
  // positives down — only judgment clauses are compared.
  const employeeGrams = ngramSet(contentWords(employeeText), 2);
  if (!employeeGrams.size) return null;

  const clauses = String(managerNotes)
    .split(/[.;\n!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((c) => MARKER_RE.test(c));

  for (const clause of clauses) {
    const grams = ngramSet(contentWords(clause), 2);
    for (const g of grams) {
      if (employeeGrams.has(g)) {
        return { reason: HARD_FAIL.PRIVATE_NOTE_LEAK, detail: `private judgment reused in employee-facing output: "${g}"` };
      }
    }
  }
  return null;
}

// OVERDIAGNOSIS_ON_THIN — when the read is thin (mostly skipped/declined), the
// engine is supposed to soften: axes go not_read, meanings hedge. This fails if
// a thin transcript still produced a confident, high-magnitude axis read — i.e.
// the softening guardrail regressed.
function checkOverdiagnosisOnThin(transcript, briefing) {
  const rq = computeReadQuality(transcript || []);
  if (!rq.partial_read) return { result: null, rq };
  const axes = Array.isArray(briefing?.axes) ? briefing.axes : [];
  for (const ax of axes) {
    const confident = ax.read_status === "read" && ax.confidence === "high";
    const strong = ax.read_status !== "not_read" && Math.abs(Number(ax.score) || 0) >= 5;
    if (confident || strong) {
      return {
        result: {
          reason: HARD_FAIL.OVERDIAGNOSIS_ON_THIN,
          detail: `partial read (${rq.note_turns}/${rq.total_turns} real notes) but axis "${ax.id}" reads ${ax.score} (${ax.confidence}/${ax.read_status})`,
        },
        rq,
      };
    }
  }
  return { result: null, rq };
}

// WRONG_MEETING_TYPE — the question bank should follow the meeting type's arc.
// Fails if fewer than half the arc stages are represented.
function checkWrongMeetingType(meetingType, bankQuestions) {
  let arc;
  try {
    // Lazy require so a pure unit test can skip arc machinery if needed.
    arc = require("../src/one-on-one-types").getArc(meetingType);
  } catch {
    return { result: null, warning: `unknown meeting type "${meetingType}" — coverage check skipped` };
  }
  const expected = (arc?.arc || []).map((s) => s.id).filter(Boolean);
  if (!expected.length) return { result: null };
  const seen = new Set((bankQuestions || []).map((q) => q.stage).filter(Boolean));
  const matched = expected.filter((id) => seen.has(id));
  const ratio = matched.length / expected.length;
  if (ratio < 0.5) {
    return {
      result: {
        reason: HARD_FAIL.WRONG_MEETING_TYPE,
        detail: `only ${matched.length}/${expected.length} arc stages covered for "${meetingType}"`,
      },
    };
  }
  return { result: null };
}

// QUESTION_INTEGRITY — invariants over the questions actually served this
// session (frozen from the Jun 11 Machar demo failures):
//   1. No two served questions with near-identical text.
//   2. No served question matching the meeting type's forbidden patterns.
//   3. No engine-internal debug text in a served question's description.
//   4. No bank-sourced question from outside this session's own bank
//      (source "generated" must appear in the session's 03-question-bank).
function checkQuestionIntegrity(transcript, bankQuestions, meetingType) {
  const failures = [];
  const served = (transcript || []).map((t) => t?.question).filter(Boolean);

  for (let i = 0; i < served.length; i += 1) {
    for (let j = i + 1; j < served.length; j += 1) {
      if (isDuplicateText(served[i].name, served[j].name)) {
        failures.push(`duplicate question text served (turns ${i + 1} and ${j + 1}): "${served[j].name}"`);
      }
    }
  }

  const patterns = forbiddenPatternsFor(meetingType);
  for (const q of served) {
    const text = `${q.name || ""} ${q.label || ""} ${q.description || ""}`;
    for (const re of patterns) {
      if (re.test(text)) {
        failures.push(`forbidden-pattern question served for "${meetingType}": "${q.name}" (${re})`);
      }
    }
  }

  const DEBUG_TEXT = /\b(runtime|injected|planner|debug)\b/i;
  for (const q of served) {
    if (DEBUG_TEXT.test(q.description || "")) {
      failures.push(`engine-internal text in served question description: "${q.description}"`);
    }
  }

  const bankAliases = new Set((bankQuestions || []).map((b) => b.alias).filter(Boolean));
  if (bankAliases.size) {
    for (const q of served) {
      if (q.source === "generated" && !bankAliases.has(q.alias)) {
        failures.push(`bank-sourced question not in this session's bank: ${q.alias} ("${q.name}")`);
      }
    }
  }

  return failures;
}

function checkSchemaInvalid(briefing, transcript) {
  if (!briefing || typeof briefing !== "object") {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: "briefing missing or unparseable" };
  }
  const missing = REQUIRED_BRIEFING_KEYS.filter((k) => !(k in briefing));
  if (missing.length) {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: `missing keys: ${missing.join(", ")}` };
  }
  // Axis score range / off-scale (state match not required here).
  const integrity = runEvalIntegrityChecks(briefing, null, transcript || [], { requireStateMatch: false })
    .filter((f) => f.includes("outside") || f.includes("off-scale"));
  if (integrity.length) {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: integrity.join("; ") };
  }
  return null;
}

// Run all deterministic checks. `metrics` (from scripts/lib/session-scores) is
// optional context that gets logged as a trend, never gated.
function runTrustChecks({ briefing, transcript = [], managerNotes = "", bankQuestions = [], focusPoints = [], meetingType, ctx = null, metrics = null } = {}) {
  const hard_fails = [];
  const warnings = [];
  const details = [];

  // Schema first — if the briefing is broken, the other content checks are moot.
  const schema = checkSchemaInvalid(briefing, transcript);
  if (schema) {
    hard_fails.push(schema.reason);
    details.push(schema.detail);
    return finalize({ hard_fails, warnings, details, metrics });
  }

  const leak = checkPrivateNoteLeak(managerNotes, briefing);
  if (leak) {
    hard_fails.push(leak.reason);
    details.push(leak.detail);
  }

  const over = checkOverdiagnosisOnThin(transcript, briefing);
  if (over.result) {
    hard_fails.push(over.result.reason);
    details.push(over.result.detail);
  }

  const type = checkWrongMeetingType(meetingType, bankQuestions);
  if (type.result) {
    hard_fails.push(type.result.reason);
    details.push(type.result.detail);
  }
  if (type.warning) warnings.push(type.warning);

  const integrity = checkQuestionIntegrity(transcript, bankQuestions, meetingType);
  if (integrity.length) {
    hard_fails.push(HARD_FAIL.QUESTION_INTEGRITY);
    details.push(...integrity);
  }

  const crossSession = runCrossSessionLeakCheck(transcript, managerNotes);
  if (crossSession.length) {
    hard_fails.push(HARD_FAIL.CROSS_SESSION_QUESTION_LEAK);
    details.push(...crossSession);
  }

  // Grounding audit is log-only for now: visible in gate details while the
  // false-positive rate is unknown. Promote to a warning/hard fail once a few
  // gate runs show it stays quiet on the happy cases (parked in
  // docs/todo/engine-trust-gates/PLAN.md).
  const grounding = runQuestionGroundingChecks(transcript, managerNotes);
  if (grounding.length) {
    details.push(...grounding.map((d) => `UNGROUNDED_PREMISE (log-only): ${d}`));
  }

  const vocab = runManagerBriefingBans(briefing);
  if (vocab.length) {
    hard_fails.push(HARD_FAIL.ENGINE_VOCAB_LEAK);
    details.push(...vocab);
  }

  const focusArc = runFocusArcGate(focusPoints, meetingType);
  if (focusArc.length) {
    hard_fails.push(HARD_FAIL.FOCUS_ARC_LEAK);
    details.push(...focusArc);
  }

  const questionArc = runQuestionArcGate(transcript, meetingType);
  if (questionArc.length) {
    hard_fails.push(HARD_FAIL.QUESTION_ARC_LEAK);
    details.push(...questionArc);
  }

  // Warning, not a hard fail: a signal-free session is legitimately silent,
  // but 4+ substantive answers with zero axis movement is an engine fault
  // until proven otherwise (AXIS_SILENT_SESSION).
  for (const w of runAxisSilenceCheck(briefing, transcript)) {
    warnings.push(`AXIS_SILENT_SESSION: ${w}`);
  }

  // Warning: axis meaning that echoes rule-example framing. The runtime guard
  // already drops its confidence to low; the gate surfaces it for review.
  for (const w of runMeaningRuleEchoCheck(briefing)) {
    warnings.push(`RULE_ECHO_MEANING: ${w}`);
  }

  const profileVocab = runRoleProfileVocabLeak(briefing);
  if (profileVocab.length) {
    hard_fails.push(HARD_FAIL.ROLE_PROFILE_VOCAB_LEAK);
    details.push(...profileVocab);
  }

  // Render-time arc gate over whatever profile this ctx resolves to on disk
  // (null-safe: no profile → trivially clean; the smoke scenario covers the
  // loaded case end-to-end).
  if (ctx && ctx.role && ctx.seniority) {
    const profileArc = runRoleProfileArcGate(loadRoleProfile(ctx), meetingType);
    if (profileArc.length) {
      hard_fails.push(HARD_FAIL.ROLE_PROFILE_ARC_LEAK);
      details.push(...profileArc);
    }
  }

  return finalize({ hard_fails, warnings, details, metrics, read_quality: over.rq });
}

function finalize({ hard_fails, warnings, details, metrics, read_quality }) {
  const verdict = hard_fails.length ? "FAIL" : warnings.length ? "WARN" : "PASS";
  return {
    verdict,
    hard_fails: [...new Set(hard_fails)],
    warnings,
    details,
    metrics: metrics || null,
    read_quality: read_quality
      ? { partial_read: read_quality.partial_read, note_turns: read_quality.note_turns, total_turns: read_quality.total_turns }
      : null,
  };
}

module.exports = {
  HARD_FAIL,
  runTrustChecks,
  employeeFacingText,
  checkPrivateNoteLeak,
  checkOverdiagnosisOnThin,
  checkWrongMeetingType,
  checkSchemaInvalid,
  checkQuestionIntegrity,
};
