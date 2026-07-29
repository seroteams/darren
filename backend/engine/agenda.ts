// Agenda carry-forward: turn the report's agenda-check answer into a durable
// one-line item that gets re-asked in the runner and surfaced in the briefing.

import type { Question } from "../shared/question.types.ts";
import { isDecline } from "./read-quality.ts";

const MAX_SUMMARY_CHARS = 80;

// Is the agenda-check answer a topic worth re-asking, or a polite "no thanks"?
//
// machar-fixes P2. The caller used to decide this inline with "not skipped and not
// empty", so "nothing specific" was carried forward as if it were an agenda item and
// bought itself an extra turn. `isDecline` already lists those phrases verbatim
// (read-quality.ts) — the carry-forward simply never consulted it. Named and pure so
// the rule is testable on its own rather than buried in the SSE handler.
export function shouldCarryAgendaForward(answer: { skipped?: boolean; text?: string }): boolean {
  if (answer?.skipped) return false;
  const text = String(answer?.text || "").trim();
  if (!text) return false;
  return !isDecline(text);
}

// Deterministic one-line condense of the raw agenda answer. No model call.
export function summarizeAgenda(raw: string | undefined): string {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  // Prefer the first sentence if it fits cleanly.
  const firstSentence = text.match(/^.*?[.!?](?=\s|$)/);
  let out = firstSentence ? firstSentence[0] : text;
  if (out.length > MAX_SUMMARY_CHARS) {
    const slice = out.slice(0, MAX_SUMMARY_CHARS);
    const lastSpace = slice.lastIndexOf(" ");
    out = (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim() + "…";
  }
  return out.replace(/[.,;:\s]+$/, "").trim();
}

export function buildCarryForwardQuestion(summary: string, stageId: string | null): Question {
  const q: Question = {
    alias: "q_agenda_carry_forward",
    label: "Also cover today",
    name: `At the start they wanted to make sure you covered: "${summary}". Dig into it.`,
    description: "Carried forward from the agenda check.",
    purpose: "engagement",
    stage: stageId,
    axis_effects: { engagement: 1 },
    source: "agenda_carry_forward",
    // Built in code, so its manager coaching is written here rather than by the
    // model (question-support-hints Phase 3). It always asks the same thing —
    // pick up what they asked for at the top — so fixed lines fit it exactly.
    hints: [
      { kind: "ask", text: "Use their words for it, not your summary of them." },
      { kind: "listen", text: "Whether this still matters as much as it did at the start." },
      { kind: "listen", text: "Whether they wanted a decision from you, or just to be heard." },
    ],
  };
  return Object.freeze(q);
}
