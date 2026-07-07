// Offline pass/fail gates for golden regression scenarios (Priya Jun02+).

import fs from "node:fs";
import path from "node:path";
import { validateQuestionBeforeShow, startsWithBrokenFragment } from "./question-validator.ts";
import { applyManagerBriefingPostProcess } from "./reviewer.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { AXIS_IDS, AXIS_MIN, AXIS_MAX } from "./axes.ts";
import { FOCUS_POINTS_FILE } from "./paths.mts";
import { renderRoleProfileBlock } from "./role-profile.ts";
import { loadDir, QUESTIONS_ROOT } from "./questions.ts";
import { listTypes, listStageIds } from "./one-on-one-types/index.ts";

import type { Briefing } from "../shared/briefing.types.ts";
import type { AxisState } from "../shared/session.types.ts";
import { isObjectRecord, asRecord, asString } from "../shared/guards.ts";

// Disk JSON / model output / fixture briefings are unchecked until narrowed —
// narrow with these instead of trusting shapes (the established house pattern).

// The gates read transcript turns and briefings defensively (model output and
// hand-crafted regression fixtures, not guaranteed-complete shapes). A turn here
// may carry top-level alias/stage and a richer question (e.g. `grounding`) than
// the canonical Question contract — read loosely, exactly as the original did.
interface GateQuestion {
  name?: string;
  alias?: string;
  purpose?: string;
  grounding?: string;
}
interface GateTurn {
  turn?: number;
  answer?: string;
  skipped?: boolean;
  question?: GateQuestion;
}
type GateTranscript = ReadonlyArray<GateTurn> | null | undefined;

// A model- or fixture-produced briefing arrives unchecked; the eval wire is
// schema-constrained, so confirm the structural minimum (an axes array) and read
// it as a Briefing — the same pragmatic narrowing the engine uses for model JSON.
function isBriefingShape(v: unknown): v is Briefing {
  return isObjectRecord(v) && Array.isArray(v.axes);
}

// Focus catalogue category lookup (id -> category) for the relational-arc gate.
const FOCUS_CATALOGUE = asRecord(JSON.parse(fs.readFileSync(FOCUS_POINTS_FILE, "utf8")));
const FOCUS_CATEGORY_BY_ID = new Map<string, unknown>(
  (Array.isArray(FOCUS_CATALOGUE.focus_points) ? FOCUS_CATALOGUE.focus_points : []).map(
    (fp): [string, unknown] => {
      const rec = asRecord(fp);
      return [asString(rec.id), rec.category];
    }
  )
);

// isCompetencyFocus — resolve a focus-point id to the catalogue category and
// report whether it is `competency` (evaluative). Id-only lookup, normalised
// the same way selected-focus does (never trusting a passed-in category field).
// Used by the preparation runner's relational-arc gate.
export function isCompetencyFocus(id: unknown): boolean {
  const key = String(id || "").trim().toLowerCase().replace(/\s+/g, "_");
  return FOCUS_CATEGORY_BY_ID.get(key) === "competency";
}

// runFocusArcGate — for Bi-weekly check-in and Something feels off, every focus
// point must be a `wellbeing`/`topic` entry; a `competency` entry is a hard fail.
// Category is resolved from the catalogue by id (never trusting a passed-in
// field). Detection only: it never edits the model output. Returns a failures
// array (mirrors runManagerBriefingBans).
function runFocusArcGate(focusPoints: unknown, meetingType: string): string[] {
  const failures: string[] = [];
  if (!isRelationalArc(meetingType)) return failures;
  const points: unknown[] = Array.isArray(focusPoints) ? focusPoints : [];
  for (const fp of points) {
    const id = isObjectRecord(fp) ? asString(fp.id) : "";
    if (!id) continue;
    if (FOCUS_CATEGORY_BY_ID.get(id) === "competency") {
      failures.push(`relational arc "${meetingType}" emitted competency focus point: ${id}`);
    }
  }
  return failures;
}

// runFocusShapeGate — copy-quality tripwires over the generated focus points,
// straight from the generate-focus-points prompt's own hard rules. Detection
// only: it never edits the model output — it flags a point whose wording breaks
// a rule so the PROMPT gets fixed (honest-surface, no silent masking). Reach is
// a blatant tripwire, consistent with the rest of this file:
//   - best_practice reasons: banned marketing phrases, and the required opener
//     (Whether / How they're / What / If).
//   - any label: a question addressed to the report — proxied as "?"-ending AND
//     second-person, so options-framing labels ("Late nights — push, overload,
//     or preference?") pass while "What's affecting your energy?" fails.
const FOCUS_BANNED_REASON_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "standard … anchor", re: /\bstandard\b[\w\s-]*\banchor\b/i },
  { label: "hygiene", re: /\bhygiene\b/i },
  { label: "cleanest channel", re: /\bcleanest channel\b/i },
  { label: "the channel for", re: /\bthe channel for\b/i },
  { label: "at this seniority", re: /\bat this seniority\b/i },
  { label: "redirect the relationship", re: /\bredirect the relationship\b/i },
  { label: "is what gets evaluated", re: /\bis what gets evaluated\b/i },
  { label: "crucial for", re: /\bcrucial for\b/i },
  { label: "essential to", re: /\bessential to\b/i },
  { label: "key to", re: /\bkey to\b/i },
  { label: "important for", re: /\bimportant for\b/i },
  { label: "surface what", re: /\bsurface what\b/i },
  { label: "space to surface", re: /\bspace to surface\b/i },
  { label: "ensure alignment", re: /\bensure alignment\b/i },
  { label: "pulse check", re: /\bpulse[\s-]?check\b/i },
];
const FOCUS_REASON_OPENER = /^(?:Whether |How they['’]re |What |If )/;
const FOCUS_LABEL_SECOND_PERSON = /\byou\b|\byour\b|\byou['’]re\b/i;

function runFocusShapeGate(focusPoints: unknown): string[] {
  const failures: string[] = [];
  const points: unknown[] = Array.isArray(focusPoints) ? focusPoints : [];
  for (const p of points) {
    if (!isObjectRecord(p)) continue;
    const name = asString(p.id) || asString(p.label) || "unnamed";
    const label = asString(p.label).trim();
    const reason = asString(p.reason).trim();

    if (label.endsWith("?") && FOCUS_LABEL_SECOND_PERSON.test(label)) {
      failures.push(`focus label reads as a question to the report: "${label}" (${name})`);
    }

    if (asString(p.source) === "best_practice" && reason) {
      for (const b of FOCUS_BANNED_REASON_PATTERNS) {
        if (b.re.test(reason)) {
          failures.push(`best_practice reason uses banned phrase "${b.label}": "${reason}" (${name})`);
        }
      }
      if (!FOCUS_REASON_OPENER.test(reason)) {
        failures.push(`best_practice reason must open Whether/How they're/What/If: "${reason}" (${name})`);
      }
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
function runQuestionArcGate(transcript: GateTranscript, meetingType: string): string[] {
  const failures: string[] = [];
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
function runRoleProfileArcGate(profileDoc: unknown, meetingType: string): string[] {
  const failures: string[] = [];
  if (!isRelationalArc(meetingType)) return failures;
  if (!isObjectRecord(profileDoc) || !isObjectRecord(profileDoc.profile)) return failures;
  const profile = profileDoc.profile;
  const rendered = renderRoleProfileBlock(profileDoc, { slice: "full", meetingType });
  const knownChallenges = Array.isArray(profile.known_challenges) ? profile.known_challenges : [];
  const themes = Array.isArray(profile.recommended_question_themes)
    ? profile.recommended_question_themes
    : [];
  const competencyTexts = [
    ...knownChallenges
      .filter((c) => isObjectRecord(c) && c.category === "competency")
      .map((c) => asString(asRecord(c).text)),
    ...themes
      .filter((t) => isObjectRecord(t) && t.category === "competency")
      .map((t) => asString(asRecord(t).theme)),
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

function runRoleProfileVocabLeak(briefing: Briefing): string[] {
  const text = collectBriefingText(briefing).toLowerCase();
  const failures: string[] = [];
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
function findJargon(text: unknown): string | null {
  for (const re of JARGON_PATTERNS) {
    const m = String(text || "").match(re);
    if (m) return m[0] ?? null;
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
function runQuestionGroundingChecks(transcript: GateTranscript, managerNotes: unknown): string[] {
  const norm = (s: unknown): string =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const failures: string[] = [];
  let saidSoFar = norm(managerNotes);
  for (const t of transcript || []) {
    const q = t?.question;
    const g = norm(q?.grounding);
    if (g && g !== "open") {
      const tokens = g.split(" ").filter((w) => w.length > 3);
      const ok = saidSoFar.includes(g) || (tokens.length > 0 && tokens.every((w) => saidSoFar.includes(w)));
      if (!ok) {
        failures.push(`turn ${t?.turn}: grounding quote not found in session record: "${q?.grounding}"`);
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
function runStageTagOrphanCheck(): string[] {
  const failures: string[] = [];

  const allStageIds = new Set<string>();
  for (const t of listTypes()) {
    const ids = listStageIds(t.slug);
    ids.forEach((id) => allStageIds.add(id));
    const idSet = new Set(ids);
    for (const q of loadDir(path.join("_intro", t.slug))) {
      const stage = asString(q.stage);
      if (stage && !idSet.has(stage)) {
        failures.push(
          `intro question "${asString(q.alias) || asString(q.name)}" (${t.slug}) tagged to unknown stage "${stage}"`
        );
      }
    }
  }

  let openers: unknown = [];
  try {
    openers = JSON.parse(
      fs.readFileSync(path.join(QUESTIONS_ROOT, "_openers.json"), "utf8")
    );
  } catch {
    openers = [];
  }
  for (const o of Array.isArray(openers) ? openers : []) {
    const stage = isObjectRecord(o) ? asString(o.stage) : "";
    if (isObjectRecord(o) && stage && !allStageIds.has(stage)) {
      failures.push(
        `opener "${asString(o.alias) || asString(o.id) || asString(o.name)}" tagged to unknown stage "${stage}"`
      );
    }
  }
  return failures;
}

function runCrossSessionLeakCheck(transcript: GateTranscript, managerNotes: unknown): string[] {
  const failures: string[] = [];
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
// (warning) and the runtime confidence downgrade in reviewer.ts.
function ruleEchoAxisIds(briefing: Briefing): Set<string> {
  const ids = new Set<string>();
  for (const ax of briefing?.axes || []) {
    if (RULE_ECHO_PHRASES.some((re) => re.test(ax?.meaning || ""))) ids.add(ax.id);
  }
  return ids;
}

function runMeaningRuleEchoCheck(briefing: Briefing): string[] {
  return [...ruleEchoAxisIds(briefing)].map(
    (id) => `axis ${id} meaning echoes rule-example framing, not this session's words`
  );
}

function collectBriefingText(briefing: Briefing): string {
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

function runManagerBriefingBans(briefing: Briefing): string[] {
  const text = collectBriefingText(briefing).toLowerCase();
  const failures: string[] = [];
  for (const ban of MANAGER_BRIEFING_BANS) {
    const re = ban === "hought" ? /\bhought\b/i : new RegExp(ban.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) failures.push(`manager briefing contains banned phrase: ${ban}`);
  }
  if (/^\s*thought retry logic\b/m.test(collectBriefingText(briefing))) {
    failures.push("manager briefing uses thought retry logic as question stem");
  }
  return failures;
}

function transcriptAnswers(transcript: GateTranscript): string {
  return (transcript || []).map((t) => String(t?.answer || "")).join("\n");
}

function runWellbeingMeaningCheck(briefing: Briefing, transcript: GateTranscript): string[] {
  const failures: string[] = [];
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

function transcriptShowsLearningCommitment(transcript: GateTranscript): boolean {
  const joined = transcriptAnswers(transcript).toLowerCase();
  const hasMiss = /\b(missed|wrong|assumption|failed|did not)\b/.test(joined);
  const hasCause = /\b(because|retry|edge case|logic|escalat)\b/.test(joined);
  const hasCommit =
    /\b(will|before handoff|checklist|commit|differently|going to)\b/.test(joined);
  return hasMiss && hasCause && hasCommit;
}

function runGrowthMeaningCheck(briefing: Briefing, transcript: GateTranscript): string[] {
  const failures: string[] = [];
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

function runEvalIntegrityChecks(
  briefing: Briefing,
  axisState: AxisState | null | undefined,
  transcript: GateTranscript,
  { requireStateMatch = true }: { requireStateMatch?: boolean } = {}
): string[] {
  const failures: string[] = [];
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
      const expected = axisState?.[ax.id]?.score;
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
function runAxisSilenceCheck(briefing: Briefing, transcript: GateTranscript): string[] {
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

function runQuestionStemChecks(transcript: GateTranscript): string[] {
  const failures: string[] = [];
  for (const t of transcript || []) {
    const name = t?.question?.name || "";
    const answer = t?.answer || "";
    if (startsWithBrokenFragment(name)) {
      failures.push(`transcript turn ${t.turn}: broken question stem: ${name.slice(0, 60)}`);
    }
    if (/^thought retry logic\b/i.test(name) && !/^when you assumed/i.test(name)) {
      failures.push(`transcript turn ${t.turn}: banned note shorthand stem`);
    }
    const v = validateQuestionBeforeShow({ name, answer });
    if (!v.ok && t?.question?.alias?.includes("thread_follow")) {
      failures.push(
        `transcript turn ${t.turn}: thread-follow would be rejected (${v.reason})`
      );
    }
  }
  return failures;
}

function runQualityPrepListenFor(
  brief: { listenFor?: string[] } | null | undefined,
  selectedFocus: { id?: unknown } | null | undefined
): string[] {
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
  const failures: string[] = [];
  if (qualityHits < Math.ceil(items.length / 2)) {
    failures.push("listenFor not majority quality/backend tells for quality focus");
  }
  if (commOnlyHits >= Math.ceil(items.length / 2)) {
    failures.push("listenFor drifts to communication-only for quality focus");
  }
  return failures;
}

function normalizeFocusId(selectedFocus: { id?: unknown } | null | undefined): string {
  return String(selectedFocus?.id || "").trim().toLowerCase();
}

interface GoldenBlock {
  transcript?: GateTurn[];
  axis_state?: AxisState;
  expectTranscriptStemFailures?: boolean;
  golden_eval_bad?: unknown;
  golden_eval_good?: unknown;
  expectPostProcessedPass?: boolean;
  telegraphic_answer?: string;
}
interface GoldenScenario {
  golden?: GoldenBlock;
  golden_transcript?: GateTurn[];
  golden_axis_state?: AxisState;
}

function runGoldenScenarioChecks(scenario: GoldenScenario): { failures: string[]; passes: string[] } {
  const g = scenario.golden;
  if (!g) return { failures: [], passes: [] };

  const failures: string[] = [];
  const passes: string[] = [];

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
  if (isBriefingShape(badEval)) {
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
    const cloned: unknown = JSON.parse(JSON.stringify(g.golden_eval_bad));
    if (isBriefingShape(cloned)) {
      const processed = applyManagerBriefingPostProcess(cloned, axisState, transcript);
      const scoreOnly = runEvalIntegrityChecks(processed, axisState, transcript, {
        requireStateMatch: true,
      }).filter((f) => !f.includes("wellbeing") && !f.includes("growth") && !f.includes("off-scale"));
      if (scoreOnly.length === 0) {
        passes.push("post-process fixes axis scores to match axis_state");
      } else {
        failures.push(...scoreOnly.map((f) => `post-process: ${f}`));
      }
    }
  }

  if (g.expectPostProcessedPass && isBriefingShape(g.golden_eval_good)) {
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
    });
    if (!v.ok) {
      passes.push("telegraphic mirror stem rejected by validator");
    } else {
      failures.push("telegraphic mirror stem should be rejected");
    }
  }

  return { failures, passes };
}

export {
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
  runFocusShapeGate,
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
