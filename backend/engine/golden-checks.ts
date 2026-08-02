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
import { AGENCY_MARKER } from "./run-health.ts";

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
  note?: string; // the planner's per-turn assessment.note (the score "why")
  realized_deltas?: Record<string, number>; // what the planner actually booked this turn
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
const FOCUS_REASON_OPENER = /^(?:Whether |How (?:they['’]re|she['’]s|he['’]s) |What |If )/;
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

// runRationaleArcGate — coach-panel Phase 3. The score "why" text is now shown
// prominently in the runner's coach panel (per-turn assessment.note) and in the
// briefing (per-axis meaning). In a relational arc that rationale must stay
// behaviour/observation-anchored: competency / craft-gap framing reads as the
// hidden performance review the focus/question/role-profile arc gates already
// keep out one layer up. Detect-only tripwire over blatant evaluative craft
// vocabulary — it flags so the PROMPT gets fixed, it never edits the model text.
// Competency framing is legitimate in the `performance` arc, so this is scoped to
// relational arcs exactly like the sibling gates.
const RATIONALE_COMPETENCY_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "skills gap", re: /\bskills?\s+gap\b/i },
  { label: "upskill", re: /\bupskill/i },
  { label: "competency/competence", re: /\bcompeten(?:cy|ce|cies)\b/i },
  { label: "proficiency", re: /\bproficien(?:t|cy)\b/i },
  { label: "capability gap / lacks capability", re: /\b(?:capability\s+gap|lacks?\s+the\s+capabilit)/i },
  { label: "technical depth/ability", re: /\btechnical\s+(?:depth|ability|skill)\b/i },
  { label: "underperform", re: /\bunder-?perform/i },
  { label: "not yet at the level / below the bar", re: /\bnot\s+(?:yet\s+)?(?:at|ready)\b[\w\s]*\b(?:level|bar)\b|\bbelow\s+the\s+bar\b/i },
  { label: "readiness for next role/level", re: /\b(?:readiness|ready)\b[\w\s]*\bnext\s+(?:role|level)\b|\bnext-level\s+readiness\b/i },
  { label: "weak on/at (a skill)", re: /\bweak(?:ness)?\s+(?:on|at|in)\b/i },
  { label: "falls/falling short", re: /\bfall(?:s|ing)\s+short\b/i },
  { label: "performance gap/concern/issue", re: /\bperformance\s+(?:gap|concern|issue|problem)\b/i },
];

function runRationaleArcGate(
  transcript: GateTranscript,
  briefing: unknown,
  meetingType: string,
): string[] {
  const failures: string[] = [];
  if (!isRelationalArc(meetingType)) return failures;
  const flag = (text: string | undefined, where: string): void => {
    if (!text) return;
    for (const p of RATIONALE_COMPETENCY_PATTERNS) {
      if (p.re.test(text)) {
        failures.push(
          `relational arc "${meetingType}" ${where} rationale uses competency framing "${p.label}": "${text.slice(0, 80)}"`
        );
      }
    }
  };
  for (const t of transcript || []) flag(t?.note, `turn ${t?.turn ?? "?"} note`);
  if (isBriefingShape(briefing)) {
    for (const ax of briefing.axes || []) flag(ax?.meaning, `axis ${ax?.id ?? "?"} meaning`);
  }
  return failures;
}

// Anything the report says about THEIR OWN state — not only distress. Deliberately
// wider than WELLBEING_TRANSCRIPT_EVIDENCE, which the briefing check uses to ask a
// different question ("is there evidence for a distress claim?"). This one asks
// "did they say anything about themselves at all?", so physical health and plain
// tiredness count. The Machar Jun-11 run answered "Got a cold but hopefully gone in
// a few days" and booked wellbeing -1: correct, because a cold IS the person, and
// flagging it would have taught us to distrust a true positive.
//
// "cold" excludes sales vocabulary, which appears in exactly the kind of 1:1 this runs on.
//
// The second clause is feelings language, added after the first version of this gate
// wrongly flagged a real one: Maya's "the comments felt like proof she wasn't good
// enough rather than feedback on the work" is unmistakably her own state, and no
// keyword in the first clause appears in it. A detect-only warning that nags on true
// positives is a warning people learn to scroll past, so this errs toward silence:
// missing a mis-score costs a count, crying wolf costs the whole gate.
const WELLBEING_PERSONAL_STATE =
  /\b(stress|stressed|burnout|burned out|burnt out|overwhelmed|anxious|anxiety|exhausted|knackered|shattered|drained|run[- ]?down|tired|tiredness|fatigue|ill|unwell|sick|poorly|flu|migraine|headache|sleep|sleeping|insomnia|recovering|recovery|energy|can't cope|can't switch off|switch off|struggling emotionally|low energy|depressed|working evenings|working weekends|annual leave|holiday|signed off)\b|\b(?:time|days?|weeks?|fortnight|months?) off\b|\bcold\b(?!\s+(?:call|calling|outreach|email|lead|start|open))|\b(felt|feels|feeling|not good enough|imposter|confidence|self[- ]doubt|morale|demoralis|deflated|frustrated|upset|worried|worrying|dreading|beating (?:him|her|them)self up)\b/i;

// runWellbeingSituationGate — machar-fixes P3. The LIVE sibling of
// runWellbeingMeaningCheck, which only ever looked at the finished briefing.
//
// The first corridor manager watched wellbeing go negative while his report
// described a TEAM problem, calmly: "I don't think Daryl's wellbeing is impacted.
// I think it's the team and he's just not done anything about it yet. So the
// wellbeing score is quite a red flag and maybe it shouldn't be."
// (docs/validation/machar-2026-07-29.md, F4.)
//
// Every existing correction for this ran at the briefing stage, after the meeting.
// Nothing watched the per-turn delta the manager sees on the coach panel while the
// 1:1 is happening. This does — and like every sibling gate it is DETECT ONLY: it
// flags so the PROMPT gets fixed, it never edits or suppresses a score.
//
// The rule it enforces is the one now stated in plan-turn.md <assessment_rules>:
// wellbeing reads the person, not the difficulty of what they are describing.
function runWellbeingSituationGate(transcript: GateTranscript): string[] {
  const failures: string[] = [];
  for (const t of transcript || []) {
    const booked = t?.realized_deltas?.wellbeing;
    if (typeof booked !== "number" || booked >= 0) continue;
    // Evidence must be in THIS turn's answer. Strain three turns ago does not
    // license a negative here, which is exactly the over-reach being caught.
    const answer = typeof t?.answer === "string" ? t.answer : "";
    if (WELLBEING_PERSONAL_STATE.test(answer)) continue;
    failures.push(
      `turn ${t?.turn ?? "?"} booked wellbeing ${booked} with no strain stated by the report: "${answer.slice(0, 80)}"`
    );
  }
  return failures;
}

// A snag named in an answer: something not working, slow, unclear, stuck, missing,
// or someone else not delivering — the trigger condition in plan-turn.md
// <question_craft> THE TRIGGER. Deliberately narrower than that prose: every term
// here names an event, never a state, so NO_INFERRED_STATES is not smuggled in
// through the gate. Grows from observed misses only, like JARGON_PATTERNS.
const SNAG_NAMED =
  /\b(stalled|stalling|stuck|slipped|slipping|slippage|slid|sliding|blocked|blocker|bottleneck|overdue|delayed|derailed|going sideways|going nowhere|no progress|not working|isn't working|doesn't work|hasn't happened|hasn't landed|hasn't moved|hasn't started|hasn't delivered|haven't delivered|never happened|still waiting|still hasn't|still haven't|keeps dropping|kept dropping|keeps slipping|dropped the ball|stopped pushing|stopped chasing|gave up on|let it slide|fallen over|falling over|nobody owns|no one owns|unowned|unclear|confusing)\b/i;

// The agency ask: a question that puts the next move back on them. Mirrors the
// "Puts it back on them" column of the same prompt block.
const AGENCY_ASK =
  /\b(what have you (tried|done|changed|said|chosen)|what did you (do|try|change|say|choose)|what would you (change|do|drop|stop|need|try)|what will you do|what are you going to do|what('s| is) your (next|first move)|what('s| is) the (next (thing|move|step)|first move)|who have you (spoken|talked)|who's next|where would you start|what would it take|what would you stop doing)\b/i;

// runAgencyFollowGate — sharper-questions P2. The gate the agency rule never had.
//
// THE TRIGGER shipped on 2026-07-29, fired on 2 turns in 2 runs that same day, and
// never fired again across the 76 saved runs. Nothing asserted it should: no golden
// check, no run-health field, no eval. A prompt rule with no gate has a half-life.
//
// Reads the session in pairs — turn N's answer, then turn N+1's question. If the
// answer named a snag and the next question did not ask what they did about it, the
// insight moved to the briefing, which is exactly the complaint this plan exists to
// fix. DETECT ONLY: it flags so the prompt gets fixed, it never rewrites a question.
//
// Conservative on purpose (a warning that nags is a warning people scroll past):
// thin answers cannot name a snag, skipped turns are not read, and the closer slot is
// exempt because THE TRIGGER yields to it.
//
// It grades the QUESTION, never the planner's own [AGENCY] marker. Trusting the marker
// was the first design and one of the two historical firings killed it: run
// 2026_Jul29_23-54 tagged `[AGENCY]` and then asked "What has made design reviews feel
// messy?", which is another description question. A self-certified marker is a claim;
// the question text is the evidence. Where the two disagree the failure says so, since
// a rule that reports itself as firing while not firing is the worse fault.
// Where wind-down starts. `<wind_down_rule>` applies at remaining_budget <= 2, and with
// remaining_budget = N - T the last turn OUTSIDE it is T = N-3, i.e. index N-4.
const lastInWindowIndex = (n: number): number => n - 4;

function isSnag(t: GateTurn | undefined): boolean {
  const answer = typeof t?.answer === "string" ? t.answer : "";
  if (answer.trim().split(/\s+/).filter(Boolean).length < 5) return false;
  return SNAG_NAMED.test(answer);
}

function runAgencyFollowGate(transcript: GateTranscript): string[] {
  const turns = (transcript || []).filter((t) => !t?.skipped);
  const failures: string[] = [];
  const lastInWindow = lastInWindowIndex(turns.length);

  // In-window: the next question must be the agency ask.
  //
  // It grades the QUESTION, never the planner's own [AGENCY] marker. Trusting the marker
  // was the first design and one of the two historical firings killed it: run
  // 2026_Jul29_23-54 tagged `[AGENCY]` and then asked "What has made design reviews feel
  // messy?", another description question. A self-certified marker is a claim; the question
  // text is the evidence. Where the two disagree the failure says so, since a rule that
  // reports itself as firing while not firing is the worse fault.
  for (let i = 0; i <= lastInWindow; i++) {
    const t = turns[i];
    if (!isSnag(t)) continue;
    if (AGENCY_ASK.test(turns[i + 1]?.question?.name ?? "")) continue;
    const claimed = String(t?.note ?? "").includes(AGENCY_MARKER)
      ? ` (note claims ${AGENCY_MARKER})`
      : "";
    failures.push(
      `turn ${t?.turn ?? "?"} named a snag and the next question did not ask what they did about it${claimed}: "${answer0(t)}"`
    );
  }

  // Inside wind-down the closer owns the slot, so the agency ask has nowhere else to go:
  // `<wind_down_rule>` → Late snag routes it INTO the closer. This is the half the first
  // version got wrong in both directions. It flagged these turns as ordinary misses, which
  // reported rule-following behaviour as a fault (biweekly-priya turn 4 of 6, planner note
  // [BUDGET-STARVED], found by the paid run on 2026-08-02). Exempting them outright then
  // hid a real gap: the snag simply never got asked about, and landed in the briefing after
  // the meeting, which is the complaint this whole plan exists to answer. So: not exempt,
  // checked against the closer instead. One failure per session, because there is only one
  // closer to carry them.
  const closer = turns[turns.length - 1]?.question?.name ?? "";
  if (!AGENCY_ASK.test(closer)) {
    for (let i = Math.max(0, lastInWindow + 1); i < turns.length - 1; i++) {
      const t = turns[i];
      if (!isSnag(t)) continue;
      failures.push(
        `turn ${t?.turn ?? "?"} named a snag inside wind-down and the closer did not pick it up: "${answer0(t)}"`
      );
      break;
    }
  }
  return failures;
}

const answer0 = (t: GateTurn | undefined): string =>
  (typeof t?.answer === "string" ? t.answer : "").slice(0, 80);

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

// runManagerBriefingGroundingChecks — POSITIVE assertions on a briefing (mined
// from old-Sero RUNNER.md, which scored "names the person / cites real data").
// The rest of this file bans bad phrases; this flags an ungrounded briefing so
// the weakness is surfaced, never masked (engine-honesty rule). Deliberately
// conservative — two blatant misses only, warn-level (not wired into the live
// evaluate() blocking path; promotion to a hard gate is Parked in the plan):
//   1. names the person — first name absent from ALL briefing prose.
//   2. cites real data  — EVERY axis is EXPLICITLY not_read (nothing read).
// Check 2 fires only on an explicit `not_read` everywhere — an absent/undefined
// read_status (legacy fixtures) gets the benefit of the doubt, so the check
// never false-alarms on a briefing that simply predates the field. Skips the
// name check when no name is given, and the data check on the known fallback
// briefing (generation_failed) — a degraded path, not a quality miss.
function runManagerBriefingGroundingChecks(
  briefing: Briefing,
  ctx: { name?: string }
): string[] {
  const failures: string[] = [];

  const firstName = String(ctx?.name || "").trim().split(/\s+/)[0] || "";
  if (firstName) {
    const text = collectBriefingText(briefing).toLowerCase();
    if (!text.includes(firstName.toLowerCase())) {
      failures.push(`manager briefing never names the person (${firstName})`);
    }
  }

  const axes = Array.isArray(briefing?.axes) ? briefing.axes : [];
  if (!briefing?.generation_failed && axes.length > 0) {
    const allNotRead = axes.every((a) => a?.read_status === "not_read");
    if (allNotRead) {
      failures.push("manager briefing cites no real data (every axis is not_read)");
    }
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
  runManagerBriefingGroundingChecks,
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
  runRationaleArcGate,
  runWellbeingSituationGate,
  runAgencyFollowGate,
  runRoleProfileVocabLeak,
  runEvalIntegrityChecks,
  runQuestionStemChecks,
  runQualityPrepListenFor,
  runGoldenScenarioChecks,
  runWellbeingMeaningCheck,
  runGrowthMeaningCheck,
};
