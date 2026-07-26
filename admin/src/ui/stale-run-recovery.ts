import { button } from "./button.ts";

// When a Resume fails — the session expired or was cleared server-side — the row heals in place
// instead of firing a native alert() and leaving a dead Resume button behind. A calm styled card
// explains it (reassuring: nothing else was lost) and offers the one useful next step: start a
// fresh prep, named for the same person when we know it. (audit M3 + X7)
export function staleRunRecoveryHtml(name: string): string {
  // The name goes in raw here on purpose: button() escapes the label, so pre-escaping
  // it would double-escape an apostrophe into &amp;#39;.
  const label = name ? `Start fresh with ${name}` : "Start a new 1:1";
  return `<div class="run-row__recovery card-flat" role="status">
      <div class="run-row__recovery-msg text-sm text-ink-dim">That prep couldn't be resumed. It may have expired or been cleared. Nothing was lost from your other 1:1s.</div>
      ${button({ label, hook: "js-start-fresh" })}
    </div>`;
}
