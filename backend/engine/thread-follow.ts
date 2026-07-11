// Runtime thread-follow: detect when an answer opens a thread worth pulling, and
// mint a grounded one-turn follow-up that mirrors the answer's own words.
// Extracted verbatim from queue-manager.ts (Phase 2 repo-tidy) — no behaviour change.
import { newAlias, saveQuestion, listAllAliases } from "./questions.ts";
import { contentTokens, isRepeatOfAsked } from "./question-eligibility.ts";
import { validateQuestionBeforeShow } from "./question-validator.ts";
import { isShallowAnswer } from "./delta-gates.ts";
import { RUNTIME_SUBDIR } from "./queue-constants.ts";
import type { Question } from "../shared/question.types.ts";
import type { TranscriptEntry } from "../shared/session.types.ts";

function isRuntimeThreadFollow(q: { source?: string; label?: string } | null | undefined): boolean {
  return q?.source === "planner_added" && q?.label === "Thread follow";
}

function answerHasThread(answer: string | null | undefined): boolean {
  if (!answer || answer === "(skipped)") return false;
  if (isShallowAnswer(answer)) return false;
  return answer.trim().split(/\s+/).filter(Boolean).length >= 5;
}

function followReferencesAnswer(answer: string | null | undefined, questionName: string | null | undefined): boolean {
  const words = String(answer || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const q = String(questionName || "").toLowerCase();
  if (!words.length) return false;
  return words.filter((w) => q.includes(w)).length >= 1;
}

function firstQueueFollowsThread(queue: Question[] | null | undefined, answer: string | null | undefined): boolean {
  if (!Array.isArray(queue) || !queue.length) return false;
  return followReferencesAnswer(answer, queue[0]?.name);
}

// The mirror must quote a contiguous run of the answer's own words, clause-
// bounded. The old version took the first three long tokens from anywhere in
// the answer — a skip-gram that read as word salad on typo-heavy notes
// ("tell will working — can you say more…", Jun 02 Luke run).
const MIRROR_FILLER = /^(yeah|yes|yep|ok|okay|well|so|um|uh|and|but)\s+/i;
function contiguousAnswerSpan(answer: string | null | undefined): string | null {
  for (const raw of String(answer || "").split(/[.!?;,\n—–]+/)) {
    let clause = raw.replace(/[^a-z0-9\s'-]/gi, " ").replace(/\s+/g, " ").trim();
    while (MIRROR_FILLER.test(clause)) clause = clause.replace(MIRROR_FILLER, "");
    const words = clause.split(" ").filter(Boolean);
    if (words.length >= 3) return words.slice(0, 6).join(" ");
  }
  return null;
}

// Ground-or-skip: a thread-follow must mirror the answer's own words. If the
// mirror stem can't pass validation, return null and inject nothing — a canned
// context-free stem fakes a connection the engine didn't make (the Jun 11
// Machar run served the identical generic stem on consecutive turns and it
// read as disconnected both times).
function buildThreadFollowQuestion(lastQuestion: Question | null | undefined, lastAnswer: string | null | undefined, transcript: TranscriptEntry[] | null | undefined): Question | null {
  const mirrorSpan = contiguousAnswerSpan(lastAnswer);
  if (!mirrorSpan) return null;
  // Quote the answer's own words, then probe the cause — the plan-turn prompt's
  // "one focused probe" craft. The old "can you say more about what that means"
  // tail was the exact phrase the validator bans on substantive answers
  // (VAGUE_MORE), so the mint could never fire on the very answers it exists
  // for — every runtime thread-follow died at validation.
  const mirrorStem = `You said "${mirrorSpan}" — what's behind that for you right now?`;

  const mirrorCheck = validateQuestionBeforeShow({
    name: mirrorStem,
    answer: lastAnswer ?? undefined,
  });
  if (!mirrorCheck.ok) return null;

  const alias = newAlias("thread follow", listAllAliases());
  return {
    alias,
    label: "Thread follow",
    name: mirrorStem,
    description: "Following up on what they just said.",
    purpose: lastQuestion?.purpose || "topic",
    stage: lastQuestion?.stage ?? null,
    axis_effects: { ...(lastQuestion?.axis_effects || { engagement: 1 }) },
    source: "planner_added",
  };
}

function enforceThreadFollow({
  newQueue,
  lastAnswer,
  lastQuestion,
  remainingBudget,
  askedNames = [],
  transcript = [],
  issues,
}: {
  newQueue: Question[];
  lastAnswer: string | null | undefined;
  lastQuestion: Question | null | undefined;
  remainingBudget: number | string | null | undefined;
  askedNames?: string[];
  transcript?: TranscriptEntry[];
  issues: string[];
}): Question[] {
  if (Number(remainingBudget) <= 2) return newQueue;
  // Don't chain a thread-follow onto another thread-follow — following a follow
  // lets one thread stall the whole arc. But a genuine NEW thread opened after
  // ordinary drilling still earns ONE follow, even under drill pressure: that's
  // the point of the feature, and Phase 1 pins the follow so the drill cap still
  // advances everything behind it. (Was: a blanket `consecutiveDrillCount >= 2`
  // bail, which went deaf exactly when the person kept opening up.)
  if (isRuntimeThreadFollow(lastQuestion)) return newQueue;
  if (!answerHasThread(lastAnswer)) return newQueue;
  if (firstQueueFollowsThread(newQueue, lastAnswer)) return newQueue;
  const follow = buildThreadFollowQuestion(lastQuestion, lastAnswer, transcript);
  if (!follow) {
    issues.push("runtime: thread-follow skipped (no stem grounded in the answer)");
    return newQueue;
  }
  // Don't inject a thread-follow that repeats a question already asked — or
  // one already sitting in the queue, which would be served as a duplicate a
  // few turns later.
  const askedTokenSets = (askedNames || []).map(contentTokens);
  const queuedTokenSets = (newQueue || []).map((q) => contentTokens(q?.name));
  if (isRepeatOfAsked(follow.name, [...askedTokenSets, ...queuedTokenSets])) {
    issues.push("runtime: thread-follow skipped (would repeat an asked or queued question)");
    return newQueue;
  }
  issues.push("runtime: injected thread-follow question");
  saveQuestion(follow, { subdir: RUNTIME_SUBDIR });
  return [follow, ...(newQueue || [])];
}

export {
  isRuntimeThreadFollow,
  answerHasThread,
  followReferencesAnswer,
  buildThreadFollowQuestion,
  enforceThreadFollow,
};
