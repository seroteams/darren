// Interview action row (design-consolidation Phase 4, audit F6). Pure string
// helpers so the row's shape and the keyboard contract are testable, mirroring
// focus-points-card.ts: the shared wizard footer geometry (ghost Back far left,
// quiet Skip middle-right, ONE primary far right, never more than three
// buttons), the Ctrl/Cmd+Enter power submit (plain Enter stays a newline), and
// the one stable exit label. The host (stages/questioning.js) wires the hooks.

import { wizardFooter } from "../ui/wizard-footer.ts";

// One label for the whole interview — it used to flip to "Wrap up. Get my
// recap" from Q4, which read as a different control mid-screen (audit F6).
// The confirm dialog still explains what happens on either path.
export const EXIT_LABEL = "Wrap up early";

// Esc-to-skip is gone; Enter is a newline. This is the only shortcut left.
export const KBD_HINT = "Ctrl+Enter to submit (Cmd+Enter on Mac)";

export type ActionRowOpts = {
  isFinal?: boolean;
  scripted?: boolean;
  canGoBack?: boolean;
};

// The row: Back (turn 2+, never in the scripted lane) far left; a quiet ghost
// in the middle-right (Skip, or "Finish without next steps" on the final turn);
// the primary far right. Scripted/dev extras never enter this row.
export function actionRowHtml({ isFinal = false, scripted = false, canGoBack = false }: ActionRowOpts = {}): string {
  const secondaryHtml = isFinal
    ? `<button class="btn btn--ghost js-finish" type="button" title="Wrap up without agreeing next actions">Finish without next steps</button>`
    : `<button class="btn btn--ghost js-skip" type="button">Skip</button>`;
  return wizardFooter({
    primary: { label: isFinal ? "Agree next actions" : "Submit answer" },
    back: canGoBack && !scripted ? {} : undefined,
    secondaryHtml,
  });
}

// Replay-lane controls for the scripted meta strip (dev/QA chrome, already
// scripted-only) — moved out of the action row to keep it at three.
export function scriptedControlsHtml(): string {
  return (
    `<button class="btn btn--ghost btn--sm js-play" type="button">Insert scripted answer</button>` +
    `<button class="btn btn--ghost btn--sm js-play-submit" type="button">Insert &amp; submit</button>`
  );
}

// Ctrl/Cmd+Enter submits. Plain Enter (and Shift+Enter) falls through to the
// textarea's default: a newline.
export function isSubmitShortcut(e: { key: string; ctrlKey?: boolean; metaKey?: boolean }): boolean {
  return e.key === "Enter" && Boolean(e.ctrlKey || e.metaKey);
}
