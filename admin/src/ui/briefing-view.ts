// The read-only briefing view — the field set the manager saw at the end of a 1:1.
// Shared so every read-only surface renders it identically: the member's own re-read
// (run-detail, PG2) and the superadmin drilldown (admin-user-detail, PG8 Step 3).
// Briefing-only, every value escaped. Mirrors review-run.js renderBriefing.

import { escapeHtml } from "./html.js";

export type NextAction = { when?: string; action?: string };
export type Briefing = {
  summary_bullets?: string[];
  understanding_paragraph?: string;
  brutal_truth_employee?: string;
  brutal_truth_manager?: string;
  next_actions?: NextAction[];
  watch_for?: string[];
};

function card(label: string, inner: string): string {
  return `<section class="card-flat space-y-2"><div class="eyebrow">${escapeHtml(label)}</div>${inner}</section>`;
}
function bullets(items: string[]): string {
  return `<ul class="l-stack l-stack--2">${items.map((x) => `<li class="text-sm">${escapeHtml(x)}</li>`).join("")}</ul>`;
}

export function renderReadonlyBriefing(b: Briefing | null): string {
  const none = `<section class="card-flat"><p class="text-sm text-ink-dim">No briefing was recorded for this 1:1.</p></section>`;
  if (!b) return none;
  const out: string[] = [];
  if ((b.summary_bullets || []).length) out.push(card("What stood out", bullets(b.summary_bullets!)));
  if (b.understanding_paragraph) out.push(card("What we understood", `<p class="text-sm">${escapeHtml(b.understanding_paragraph)}</p>`));
  if (b.brutal_truth_employee) out.push(card("Honest read — them", `<p class="text-sm">${escapeHtml(b.brutal_truth_employee)}</p>`));
  if (b.brutal_truth_manager) out.push(card("Honest read — you", `<p class="text-sm">${escapeHtml(b.brutal_truth_manager)}</p>`));
  if ((b.next_actions || []).length) {
    const items = b.next_actions!.map((a) => `<li class="text-sm">${a.when ? escapeHtml(a.when) + ": " : ""}${escapeHtml(a.action || "")}</li>`);
    out.push(card("What to do next", `<ul class="l-stack l-stack--2">${items.join("")}</ul>`));
  }
  if ((b.watch_for || []).length) out.push(card("Reminders", bullets(b.watch_for!)));
  return out.join("") || none;
}
