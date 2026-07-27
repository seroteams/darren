// The walk-in gate (runner-readiness) — the runner's FIRST screen, before any
// question. Two jobs: ask whether the manager is ready, and put the reason they
// are walking in back in front of them (the prep brief's theme and the outcome
// to aim for). Pure string render like questioning-actions.ts, so the shape and
// the honesty rules are testable; the host (stages/questioning.js) wires
// js-wf-continue and owns the DOM.
//
// Honesty: the reasons are the brief's own fields, verbatim. No brief (a guest
// run, a resumed session with no stored prep) means NO reasons — the card says
// so plainly rather than inventing a purpose.

import { escapeCopy } from "../ui/html.js";
import { wizardFooter } from "../ui/wizard-footer.ts";

export type ReadyBrief = {
  coreIssue?: unknown;
  goodOutcome?: unknown;
} | null | undefined;

export const READY_STEP_LABEL = "Before you walk in";
export const READY_CTA = "Start the meeting";
// Shown INSTEAD of reasons when there is no brief to quote.
export const READY_NO_BRIEF =
  "There's no brief on this one, so nothing to hand you. Go in on what you already know.";

export type ReadyReason = { label: string; text: string };

const clean = (v: unknown): string => String(v ?? "").trim();

// The two brief slots that answer "why am I walking in": the likely theme, and
// what a good version of this meeting leaves you with. Labels match the brief's
// own wording where it has one (SLOT_LABELS.leaveWith), so the same content
// never answers to two names across the two screens.
export function readyReasons(brief: ReadyBrief): ReadyReason[] {
  const theme = clean(brief?.coreIssue);
  const outcome = clean(brief?.goodOutcome);
  const out: ReadyReason[] = [];
  if (theme) out.push({ label: "Why you're walking in", text: theme });
  if (outcome) out.push({ label: "Aim to leave with", text: outcome });
  return out;
}

export function readyHeading(name: string): string {
  const who = clean(name);
  return who ? `Ready to start with ${who}?` : "Ready to start?";
}

export function readyCardHtml({ name = "", brief = null }: { name?: string; brief?: ReadyBrief } = {}): string {
  const reasons = readyReasons(brief);
  const body = reasons.length
    ? `<div class="cp-ready__reasons">${reasons
        .map(
          (r) => `<div class="cp-ready__reason">
        <span class="eyebrow">${escapeCopy(r.label)}</span>
        <p class="cp-ready__text">${escapeCopy(r.text)}</p>
      </div>`
        )
        .join("")}</div>`
    : `<p class="question-desc">${escapeCopy(READY_NO_BRIEF)}</p>`;
  return `<div class="question-card-head__text space-y-2">
      <h1 class="question-stem leading-snug">${escapeCopy(readyHeading(name))}</h1>
    </div>
    ${body}
    ${wizardFooter({ primary: { label: READY_CTA } })}`;
}

// Shown once per 1:1, not once per page load: a mid-meeting refresh drops you
// back on the question you were on, never on "ready to start?" again. Keyed per
// session in sessionStorage (same store the coach panel uses for its whys), so
// it dies with the tab and can never leak between two 1:1s.
export function readyKey(sessionId: string): string {
  return `sero.ready.${sessionId}`;
}

export function readyAlreadyShown(sessionId: string): boolean {
  try {
    return window.sessionStorage.getItem(readyKey(sessionId)) === "1";
  } catch {
    return false; // storage blocked: show the gate, it's the harmless direction
  }
}

export function markReadyShown(sessionId: string): void {
  try {
    window.sessionStorage.setItem(readyKey(sessionId), "1");
  } catch {
    /* storage blocked — the gate just shows again on a refresh */
  }
}
