// Runtime thread-follow: detect whether the planner picked up a thread the last
// answer opened, and record what it found. This module used to MINT the follow-up
// itself, in code, from one fixed sentence:
//
//   You said "<clause from the answer>" — what's behind that for you right now?
//
// That was removed on 2026-07-30 (Carl: "questions like this feel very bland").
// A fixed tail can never not be bland, its clause slicer had no word-boundary
// guard (it served `"ne wants time to improve things"` from "…one wants…" on the
// Jul-29 user test), and it carried an em dash, which is banned in Sero copy.
// The follow-up is now the model's job: <thread_follow_rule> in
// content/prompts/plan-turn.md makes drilling an open thread the first new_queue
// item, phrased fresh rather than pasted. Nothing here writes question text.
import { isShallowAnswer } from "./delta-gates.ts";
import type { Question } from "../shared/question.types.ts";

// Matches the code-minted follow-ups that ran until 2026-07-30, so replayed
// sessions and saved q_thread_follow_* rows still behave. New follow-ups are
// model-written and carry `follows_thread` instead.
function isRuntimeThreadFollow(q: { source?: string; label?: string } | null | undefined): boolean {
  return q?.source === "planner_added" && q?.label === "Thread follow";
}

function isFollowUpQuestion(q: Question | null | undefined): boolean {
  return q?.follows_thread === true || isRuntimeThreadFollow(q);
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

// Read-only on queue membership: tag the planner's own follow-up when it picked
// the thread up, note it when it didn't. Never inserts, reorders, or removes.
//
// The note is a heuristic and says so. followReferencesAnswer needs just one
// shared word over 4 characters, while the prompt tells the model to rephrase the
// note rather than paste it — so a good rephrasing can read as a miss here. It is
// a run record for us, and never reaches a screen.
function markThreadFollow({
  newQueue,
  lastAnswer,
  lastQuestion,
  remainingBudget,
  issues,
}: {
  newQueue: Question[];
  lastAnswer: string | null | undefined;
  lastQuestion: Question | null | undefined;
  remainingBudget: number | string | null | undefined;
  issues: string[];
}): void {
  // Same guards the mint used, for the same reasons: in wind-down the arc has to
  // reach the closer, a follow of a follow lets one thread stall everything, and
  // a shallow or skipped answer opens no thread to follow.
  if (Number(remainingBudget) <= 2) return;
  if (isFollowUpQuestion(lastQuestion)) return;
  if (!answerHasThread(lastAnswer)) return;
  const first = Array.isArray(newQueue) ? newQueue[0] : undefined;
  if (!first) return;

  if (followReferencesAnswer(lastAnswer, first.name)) {
    // Lets the question screen show its "following up on what you just said" cue
    // on a model-written drill, which carries no q_thread_follow alias to match.
    first.follows_thread = true;
    return;
  }
  issues.push("runtime: planner may have dropped the open thread (heuristic)");
}

export {
  isRuntimeThreadFollow,
  isFollowUpQuestion,
  answerHasThread,
  followReferencesAnswer,
  firstQueueFollowsThread,
  markThreadFollow,
};
