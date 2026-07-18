// Queue reconciliation + grounding: turn the planner's raw queue into materialised
// Question objects, dropping repeats / off-arc / ungrounded items. Includes the
// axis-delta coercion the reconcile + scoring paths share. Extracted verbatim from
// queue-manager.ts (Phase 2 repo-tidy).
import { newAlias, saveQuestion, listAllAliases } from "./questions.ts";
import { checkQuestionEligibility, contentTokens, isRepeatOfAsked } from "./question-eligibility.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { AXIS_IDS } from "./axes.ts";
import { ALLOWED_DELTAS, MAX_QUEUE, RUNTIME_SUBDIR } from "./queue-constants.ts";
import { isObjectRecord } from "../shared/guards.ts";
import type { RawQueueItem } from "./queue-constants.ts";
import type { Question } from "../shared/question.types.ts";

function snapToAllowedDelta(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return ALLOWED_DELTAS.reduce((best, d) => {
    const dd = Math.abs(d - n);
    const bd = Math.abs(best - n);
    if (dd < bd) return d;
    // Equal distance: snap toward zero (lower magnitude), deterministically for
    // both signs — not by accident of array order.
    if (dd === bd && Math.abs(d) < Math.abs(best)) return d;
    return best;
  });
}

// Hard word cap on planner-written question text (mirrors <question_craft>
// "Length cap" in plan-turn.md). A too-long name is dropped, not truncated — a
// mangled half-question is worse than serving the next queued one.
const NAME_WORD_CAP = 18;

function nameWordCount(name: unknown): number {
  return String(name ?? "").trim().split(/\s+/).filter(Boolean).length;
}

// Shape check for planner-WRITTEN (new or reworded) question text. Returns a
// drop reason, or null if the name is usable. Carried-unchanged items never
// reach this — they return earlier in the reconcile loop.
function plannerNameIssue(name: unknown): string | null {
  const words = nameWordCount(name);
  if (words === 0) return "empty name";
  if (words > NAME_WORD_CAP) return `name exceeds ${NAME_WORD_CAP} words (${words})`;
  return null;
}

function toAxisObject(effects: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  // original passed model output straight in; AXIS_IDS.includes() already guards
  // a bad shape, so narrow each element to read .axis/.delta. (unknown[] not the
  // any[] that Array.isArray would otherwise widen the loop var to.)
  const items: unknown[] = Array.isArray(effects) ? effects : [];
  for (const e of items) {
    if (isObjectRecord(e) && typeof e.axis === "string" && AXIS_IDS.includes(e.axis)) out[e.axis] = snapToAllowedDelta(e.delta);
  }
  return out;
}

// Returns true iff a reconstructed queue item matches the referenced existing
// question on the canonical fields (ignoring whitespace).
function isUnchanged(refOriginal: Question | null | undefined, incoming: RawQueueItem): boolean {
  if (!refOriginal) return false;
  const norm = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
  if (norm(refOriginal.name) !== norm(incoming.name)) return false;
  if (norm(refOriginal.label) !== norm(incoming.label)) return false;
  if (norm(refOriginal.description) !== norm(incoming.description)) return false;
  const a = refOriginal.axis_effects || {};
  const b = toAxisObject(incoming.axis_effects);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
}

// Grounding gate for planner-written questions. The planner must cite a short
// verbatim quote from this session (`grounding`) for every new or reworded
// item, or mark it "open" (assumes nothing). A question whose premise this
// session never established is dropped whole — never patched up (the Jun 12
// Marcus run asked about a "promotion decision" that never happened; the
// Jun 12 Jordan run invented an "architecture review" forum).
const GROUNDING_OPEN = "open";

function normalizeGrounding(s: unknown): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Words any coaching question may use without the session saying them first.
// Only consulted for "open" (premise-free) items; everything else ≥5 chars
// must trace to the grounding corpus. Conservative direction: a word in this
// list can never cause a drop.
const OPEN_QUESTION_VOCAB = new Set([
  "ahead", "balance", "biggest", "capacity", "change", "changed", "changes",
  "clarity", "clearer", "concrete", "conversation", "decide", "decision",
  "decisions", "describe", "different", "differently", "easier", "easiest",
  "energy", "example", "expect", "expected", "focus", "forward", "getting",
  "going", "happen", "happened", "happening", "harder", "hardest", "helped",
  "helpful", "helping", "instead", "lately", "looking", "manager", "matter",
  "matters", "meeting", "moment", "month", "months", "moving", "needs",
  "nothing", "noticed", "otherwise", "outcome", "people", "picture",
  "priorities", "priority", "progress", "quarter", "really", "reason",
  "recent", "recently", "review", "reviews", "should", "situation", "snagged",
  "snagging", "someone",
  "something", "specific", "specifically", "start", "started", "success",
  "support", "taking", "talked", "talking", "thing", "things", "thinking",
  "through", "today", "together", "trying", "understand", "version", "wanted",
  "weeks", "working", "yourself",
]);

// Rare content words in an "open" question that the corpus never said.
// Tokens are matched on a 5-char stem so inflections don't false-positive.
function unsupportedOpenTokens(name: unknown, corpusNorm: string): string[] {
  return [...contentTokens(name)]
    .filter((w) => w.length >= 5 && !OPEN_QUESTION_VOCAB.has(w))
    .filter((w) => !corpusNorm.includes(w.slice(0, 5)));
}

// True when the cited grounding quote appears in the corpus — verbatim after
// normalisation, or all of its content words individually (tolerates light
// punctuation/reordering, not paraphrase).
function groundingQuoteSupported(grounding: unknown, corpusNorm: string): boolean {
  const g = normalizeGrounding(grounding);
  if (!g) return false;
  if (corpusNorm.includes(g)) return true;
  const tokens = [...contentTokens(g)];
  return tokens.length > 0 && tokens.every((w) => corpusNorm.includes(w));
}

// Resolved-cause repeat gate -------------------------------------------------
// A "resolved cause" is a snag the manager has already NAMED and EXPLAINED this
// session. The planner lists them each turn (`resolved_causes`) and tags every
// queued item — carried-forward or new — with the cause it re-probes
// (`probes_cause`, copied verbatim from that list) and whether it seeks a
// genuinely new layer (`new_layer`). An item that re-probes a resolved cause
// with no new layer is a reworded repeat: dropped here in code and logged, never
// left to the prompt's discretion. This catches same-cause questions that share
// no wording — the Jul tester answered "other pressing deadlines", then got
// re-asked "what deadlines crowd out the work" (near-zero token overlap, so the
// lexical repeat gate sailed right past it).

// Overlap of the item's cause tag against a resolved-cause label, relative to
// the smaller token set — a short label ("pressing deadlines") fully inside a
// longer tag still counts. The planner is asked to COPY the resolved-cause
// string into probes_cause, so this is usually an exact hit; the tolerance only
// absorbs light drift between the two model outputs.
const RESOLVED_CAUSE_OVERLAP = 0.6;

function causeOverlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

// Returns the matched resolved cause when `item` re-probes it with no new layer,
// else null. Pure — the reconcile loop uses it to drop; unit-tested directly.
function resolvedCauseHit(item: RawQueueItem, resolvedCauses: string[]): string | null {
  if (!item || !item.probes_cause || item.new_layer) return null;
  const cand = contentTokens(item.probes_cause);
  if (cand.size === 0) return null;
  for (const cause of resolvedCauses || []) {
    const ct = contentTokens(cause);
    if (ct.size === 0) continue;
    if (causeOverlap(cand, ct) >= RESOLVED_CAUSE_OVERLAP) return cause;
  }
  return null;
}

// Reconcile AI-returned items against the existing remaining queue +
// transcript. Produces the materialised queue of question objects.
function reconcileQueue(rawNewQueue: RawQueueItem[] | null | undefined, { remainingQueue, askedAliases, askedNames = [], meetingType = null, groundingCorpus = null, resolvedCauses = [] }: { remainingQueue: Question[]; askedAliases: Set<string>; askedNames?: string[]; meetingType?: string | null; groundingCorpus?: string | null; resolvedCauses?: string[] }): { queue: Question[]; issues: string[] } {
  const byAlias = new Map(remainingQueue.map((q) => [q.alias, q]));
  const existingAliases = listAllAliases();
  for (const q of remainingQueue) existingAliases.add(q.alias);
  for (const a of askedAliases) existingAliases.add(a);
  const askedTokenSets = askedNames.map(contentTokens);
  const out: Question[] = [];
  const issues: string[] = [];
  const usedAliases = new Set<string>();

  for (let item of rawNewQueue || []) {
    if (!item) {
      issues.push("dropped empty planner item");
      continue;
    }
    const ref = item.ref_alias ? byAlias.get(item.ref_alias) : null;
    if (item.ref_alias && !ref) {
      issues.push(`ref_alias ${item.ref_alias} not in remaining queue — treating as new`);
    }
    if (item.ref_alias && askedAliases.has(item.ref_alias)) {
      issues.push(`ref_alias ${item.ref_alias} already asked — dropping`);
      continue;
    }
    // Resolved-cause gate — runs before the unchanged/ref carry-forward so it
    // catches a previously-queued item that re-probes a cause the manager just
    // resolved this turn, not only freshly-written ones.
    const causeHit = resolvedCauseHit(item, resolvedCauses);
    if (causeHit) {
      issues.push(`resolved-cause: dropped "${item.label || item.name || item.ref_alias}" — re-probes resolved cause "${causeHit}" with no new layer`);
      continue;
    }
    // Check the WHITELISTED axis set, not the raw array: an item can arrive with
    // a non-empty axis_effects whose every id is off the four-axis whitelist
    // (toAxisObject strips those), which would otherwise materialise as an empty
    // signature and violate the <rules> "non-empty axis_effects" contract.
    if (Object.keys(toAxisObject(item.axis_effects)).length === 0) {
      // The planner often omits axis_effects on carried-forward refs. That's
      // recoverable — inherit the referenced question's signature rather than
      // dropping the question (the old order dropped BEFORE ref resolution,
      // which bled signatures out of runs until axes shipped "not read").
      if (ref) {
        item = {
          ...item,
          axis_effects: Object.entries(ref.axis_effects || {}).map(([axis, delta]) => ({ axis, delta })),
        };
        issues.push(`inherited axis_effects from ${ref.alias}`);
      } else {
        const hadAxes = Array.isArray(item.axis_effects) && item.axis_effects.length > 0;
        issues.push(
          hadAxes
            ? `dropped item with no valid axis_effects (all off-whitelist): ${item.label || "(no label)"}`
            : `dropped item with empty axis_effects: ${item.label || "(no label)"}`
        );
        continue;
      }
    }

    if (ref && isUnchanged(ref, item)) {
      if (usedAliases.has(ref.alias)) {
        issues.push(`duplicate reuse of alias ${ref.alias} — skipping second`);
        continue;
      }
      usedAliases.add(ref.alias);
      out.push(ref);
      continue;
    }

    // Name-shape gate — planner-written text (new or reworded; carried-unchanged
    // items returned above) must be a single usable question: non-empty and
    // within the word cap. On a reworded item, fall back to the untouched
    // original, mirroring the grounding gate's carry-forward.
    const nameIssue = plannerNameIssue(item.name);
    if (nameIssue) {
      issues.push(`name-shape: dropped planner item "${item.label || "(no label)"}" (${nameIssue})`);
      if (ref && !usedAliases.has(ref.alias)) {
        usedAliases.add(ref.alias);
        out.push(ref);
      }
      continue;
    }

    if (isRepeatOfAsked(item.name, askedTokenSets)) {
      issues.push(`dropped repeat of already-asked question: ${item.name}`);
      continue;
    }

    // New planner items also pass the type's forbidden patterns — the planner
    // free-writes question text every turn, so it can violate the 1:1 type's
    // rules just like a bad opener or seed.
    const eligibility = checkQuestionEligibility(item, { meetingType: meetingType ?? undefined });
    if (!eligibility.ok) {
      issues.push(
        `eligibility: dropped planner item "${item.label || item.name}" (${eligibility.reason}: ${eligibility.matched})`
      );
      continue;
    }

    // Relational-arc gate: the planner can't write an evaluative question into
    // a check-in. No ref carry-forward here — if the planner labelled it
    // competency, the original (if any) is suspect for the same reason.
    if (item.purpose === "competency" && isRelationalArc(meetingType ?? undefined)) {
      issues.push(
        `arc gate: dropped planner competency question for relational arc: ${item.label || item.name}`
      );
      continue;
    }

    // Grounding gate — new/reworded wording must cite a premise this session
    // actually established. On failure, carry the untouched original forward
    // (if any) instead of the planner's version; never reword the stem.
    if (groundingCorpus != null) {
      const g = normalizeGrounding(item.grounding);
      const failed =
        !g || g === GROUNDING_OPEN
          ? unsupportedOpenTokens(item.name, groundingCorpus).length > 0
          : !groundingQuoteSupported(item.grounding, groundingCorpus);
      if (failed) {
        const why =
          !g || g === GROUNDING_OPEN
            ? `unsupported premise (${unsupportedOpenTokens(item.name, groundingCorpus).join(", ")})`
            : `unverifiable premise quote ("${item.grounding}")`;
        issues.push(`grounding: dropped planner question with ${why}: ${item.label || item.name}`);
        if (ref && !usedAliases.has(ref.alias)) {
          usedAliases.add(ref.alias);
          out.push(ref);
        }
        continue;
      }
    }

    const baseLabel = item.label || (ref ? ref.label : "unnamed");
    const alias = newAlias(baseLabel, new Set([...existingAliases, ...usedAliases]));
    existingAliases.add(alias);
    usedAliases.add(alias);
    const source = ref ? `reworded_from:${ref.alias}` : "planner_added";
    const q: Question = {
      alias,
      label: item.label ?? "",
      name: item.name ?? "",
      description: item.description ?? "",
      purpose: item.purpose ?? "topic",
      stage: item.stage ?? ref?.stage ?? null,
      axis_effects: toAxisObject(item.axis_effects),
      source,
      // Carried into the transcript so the grounding audit can re-verify
      // served questions after the fact.
      ...(item.grounding ? { grounding: item.grounding } : {}),
    };
    saveQuestion(q, { subdir: RUNTIME_SUBDIR });
    out.push(q);
  }

  // Cap length
  if (out.length > MAX_QUEUE) {
    issues.push(`truncated queue from ${out.length} to ${MAX_QUEUE}`);
    out.length = MAX_QUEUE;
  }

  return { queue: out, issues };
}


export { snapToAllowedDelta, toAxisObject, nameWordCount, plannerNameIssue, isUnchanged, normalizeGrounding, resolvedCauseHit, reconcileQueue };
