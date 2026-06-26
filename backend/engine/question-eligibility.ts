// Central admission gate for questions. Every path that can put a question in
// front of the manager — opener pick, generated bank, thread-follow injection,
// coverage insertion, seed overflow, and the serve-time check itself — runs
// through checkQuestionEligibility first. Two rules:
//   1. The active 1:1 type's forbidden patterns (forbidden_question_res on the
//      type definition — the machine-checkable subset of its anti_patterns).
//   2. Distinctness from questions already asked this session, compared on
//      normalized text, not aliases — planner injections mint fresh aliases,
//      so alias checks miss textual repeats (the Jun 11 Machar run asked the
//      identical thread-follow stem on consecutive turns that way).
// Rejections are logged via rejectionEntry/appendEligibilityLog — log-only,
// never user-facing.

import fs from "node:fs";

import { getType } from "./one-on-one-types/index.ts";

interface EligibilityQuestion {
  name?: string;
  label?: string;
  description?: string;
  alias?: string;
}

type EligibilityResult = { ok: true } | { ok: false; reason: string; matched: string };

interface RejectionLogEntry {
  alias: string | null;
  label: string | null;
  name: string | null;
  source: string;
  reason: string;
  matched: string | null;
  meetingType: string | null;
  fallback: string | null;
}

// Words stripped before comparing question wording — scaffolding shared by
// most questions, so they carry no signal about whether two questions match.
const REPEAT_STOP = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "to", "of", "in", "on", "for", "with", "at", "by",
  "from", "about", "as", "into", "and", "or", "but", "if", "then", "that",
  "this", "these", "those", "what", "whats", "how", "when", "where", "which",
  "who", "why", "you", "your", "youre", "yours", "i", "we", "they", "it",
  "its", "me", "my", "our", "us", "them", "their", "can", "could", "would",
  "should", "will", "feel", "feels", "like", "one", "any", "right", "now",
]);

// Reduce a question to its set of content words (lowercased, punctuation and
// stop words removed). Used to detect within-session repeats.
function contentTokens(text: unknown): Set<string> {
  const s = typeof text === "string" ? text : "";
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !REPEAT_STOP.has(w)),
  );
}

const REPEAT_JACCARD = 0.7;

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

// True when two question texts are near-identical (exact content match or
// heavy word overlap). Conservative on purpose: catches repeats without
// dropping genuine follow-ups that merely reuse a topic word.
function isDuplicateText(a: unknown, b: unknown): boolean {
  return jaccard(contentTokens(a), contentTokens(b)) >= REPEAT_JACCARD;
}

// True when `candidate` repeats a question already asked this session.
function isRepeatOfAsked(candidate: unknown, askedTokenSets: Set<string>[]): boolean {
  const c = contentTokens(candidate);
  if (c.size === 0) return false;
  for (const asked of askedTokenSets) {
    if (asked.size === 0) continue;
    if (jaccard(c, asked) >= REPEAT_JACCARD) return true;
  }
  return false;
}

function forbiddenPatternsFor(meetingType: string | undefined): RegExp[] {
  if (!meetingType) return [];
  try {
    return getType(meetingType).forbidden_question_res || [];
  } catch {
    return [];
  }
}

// The gate. `question` is any object with name/label/description; `askedNames`
// is the list of question texts already asked this session. Returns {ok:true}
// or {ok:false, reason: "forbidden_pattern"|"duplicate_text", matched}.
function checkQuestionEligibility(
  question: EligibilityQuestion | null | undefined,
  { meetingType, askedNames = [] }: { meetingType?: string; askedNames?: string[] } = {},
): EligibilityResult {
  const text = `${question?.name || ""} ${question?.label || ""} ${question?.description || ""}`;
  for (const re of forbiddenPatternsFor(meetingType)) {
    if (re.test(text)) {
      return { ok: false, reason: "forbidden_pattern", matched: String(re) };
    }
  }
  const cand = contentTokens(question?.name);
  if (cand.size > 0) {
    for (const asked of askedNames) {
      const at = contentTokens(asked);
      if (at.size > 0 && jaccard(cand, at) >= REPEAT_JACCARD) {
        return { ok: false, reason: "duplicate_text", matched: asked };
      }
    }
  }
  return { ok: true };
}

// Standard shape for a rejection log entry. `source` names the path that
// tried to serve the question (opener_pick, planner_new_item, coverage_insert,
// seed_overflow, serve_time); `fallback` says what happened instead.
function rejectionEntry({
  question,
  check,
  source,
  meetingType,
  fallback,
}: {
  question?: EligibilityQuestion | null;
  check?: { reason?: string; matched?: string } | null;
  source: string;
  meetingType?: string | null;
  fallback?: string | null;
}): RejectionLogEntry {
  return {
    alias: question?.alias || null,
    label: question?.label || null,
    name: question?.name || null,
    source,
    reason: check?.reason || "unknown",
    matched: check?.matched || null,
    meetingType: meetingType || null,
    fallback: fallback || null,
  };
}

// Serve-time gate: drop ineligible questions from the head of the queue
// (mutates queueRef in place) until the head passes or the queue is empty.
// Returns the rejection entries for the caller to log. Shared by the CLI
// questioning loop and the web /api/question handler so the orchestration
// can't drift between them.
function dropIneligibleHeads(
  queueRef: EligibilityQuestion[],
  { meetingType, askedNames = [] }: { meetingType?: string; askedNames?: string[] } = {},
): RejectionLogEntry[] {
  const rejected: RejectionLogEntry[] = [];
  while (queueRef.length) {
    const head = queueRef[0];
    const check = checkQuestionEligibility(head, { meetingType, askedNames });
    if (check.ok) break;
    queueRef.shift();
    rejected.push(
      rejectionEntry({
        question: head,
        check,
        source: "serve_time",
        meetingType,
        fallback: "next queued question",
      })
    );
  }
  return rejected;
}

// Append rejection entries to the session's eligibility log file. Log-only,
// never user-facing; failures to write must never break a live turn.
function appendEligibilityLog(filePath: string | null | undefined, entries: RejectionLogEntry[] | null | undefined): void {
  if (!filePath || !entries || !entries.length) return;
  let log: unknown[] = [];
  try {
    log = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(log)) log = [];
  } catch {
    log = [];
  }
  log.push(...entries);
  try {
    fs.writeFileSync(filePath, JSON.stringify(log, null, 2));
  } catch (e) {
    console.warn("[question-eligibility] log write failed:", e instanceof Error ? e.message : String(e));
  }
}

export {
  checkQuestionEligibility,
  rejectionEntry,
  dropIneligibleHeads,
  appendEligibilityLog,
  forbiddenPatternsFor,
  contentTokens,
  isRepeatOfAsked,
  isDuplicateText,
  REPEAT_JACCARD,
};
