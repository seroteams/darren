import { escapeHtml } from "./html.js";

// When a Resume fails — the session expired or was cleared server-side — the row heals in place
// instead of firing a native alert() and leaving a dead Resume button behind. A calm styled card
// explains it (reassuring: nothing else was lost) and offers the one useful next step: start a
// fresh prep, named for the same person when we know it. (audit M3 + X7)
export function staleRunRecoveryHtml(name: string): string {
  const who = name ? escapeHtml(name) : "";
  const label = who ? `Start fresh with ${who}` : "Start a new 1:1";
  return `<div class="run-row__recovery card-flat" role="status">
      <div class="run-row__recovery-msg text-sm text-ink-dim">That prep couldn't be resumed — it may have expired or been cleared. Nothing was lost from your other 1:1s.</div>
      <button type="button" class="btn js-start-fresh">${label}</button>
    </div>`;
}
