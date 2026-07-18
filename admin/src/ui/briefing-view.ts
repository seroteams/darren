// The read-only briefing view — the field set the manager saw at the end of a 1:1.
// Shared so every read-only surface renders it identically: the member's own re-read
// (run-detail, PG2) and the superadmin drilldown (admin-user-detail, PG8 Step 3).
// Briefing-only, every value escaped. Mirrors review-run.js renderBriefing.

import { escapeHtml } from "./html.js";

export type NextAction = { when?: string; action?: string };
export type Briefing = {
  headline?: string;
  summary_bullets?: string[];
  understanding_paragraph?: string;
  brutal_truth_employee?: string;
  brutal_truth_manager?: string;
  next_actions?: NextAction[];
  watch_for?: string[];
};
// One manager-confirmed agreement from a 1:1's wrap-up, with the outcome tapped at the
// next check-in (Promises loop phase 3 read view — see backend promiseHistoryOf).
export type PromiseRow = { id: string; owner: string; action: string; when?: string; outcome: string | null };

function card(label: string, inner: string): string {
  return `<section class="card-flat space-y-2"><div class="eyebrow">${escapeHtml(label)}</div>${inner}</section>`;
}
function bullets(items: string[]): string {
  return `<ul class="l-stack l-stack--2">${items.map((x) => `<li class="text-sm">${escapeHtml(x)}</li>`).join("")}</ul>`;
}

// The check-in outcome as a house .chip (base.css recipe — no bespoke geometry). A
// resolved outcome carries the status dot; an unchecked promise reads as a plain "Open".
const OUTCOME_CHIP: Record<string, { label: string; cls: string }> = {
  yes: { label: "Done", cls: "chip chip--mint chip--dot" },
  partly: { label: "Partly", cls: "chip chip--gold chip--dot" },
  no: { label: "Not done", cls: "chip chip--coral chip--dot" },
  changed: { label: "Changed", cls: "chip chip--plain chip--dot" },
};
function outcomeChip(outcome: string | null): string {
  const o = outcome ? OUTCOME_CHIP[outcome] : null;
  return o ? `<span class="${o.cls}">${o.label}</span>` : `<span class="chip chip--plain">Open</span>`;
}

// The manager-confirmed promises of a finished run, each with its check-in outcome
// (Promises loop phase 3). Manager's own first (plan: "manager's list first in every
// UI"). Returns "" when the run armed no loop, so a caller adds no empty section.
export function renderPromiseList(promises: PromiseRow[] | null | undefined): string {
  const rows = (promises || []).filter((p) => p && p.action);
  if (!rows.length) return "";
  const ordered = [...rows].sort((a, b) => Number(a.owner !== "manager") - Number(b.owner !== "manager"));
  const items = ordered
    .map(
      (p) =>
        `<li class="promise-row"><span class="promise-row__who">${p.owner === "manager" ? "You" : "Them"}</span><span class="promise-row__action">${escapeHtml(p.action)}</span>${outcomeChip(p.outcome)}</li>`,
    )
    .join("");
  return `<ul class="promise-list">${items}</ul>`;
}

export function renderReadonlyBriefing(b: Briefing | null, name?: string, promises?: PromiseRow[] | null): string {
  const none = `<section class="card-flat"><p class="text-sm text-ink-dim">No briefing was recorded for this 1:1.</p></section>`;
  if (!b) return none;
  // The honest-read card names the person when we know who (audit C6) — "Honest read — Priya",
  // not the impersonal "them". Falls back to "them" for surfaces without a name to hand.
  const who = (name || "").trim() || "them";
  const out: string[] = [];
  if ((b.summary_bullets || []).length) out.push(card("What stood out", bullets(b.summary_bullets!)));
  if (b.understanding_paragraph) out.push(card("What we understood", `<p class="text-sm">${escapeHtml(b.understanding_paragraph)}</p>`));
  if (b.brutal_truth_employee) out.push(card(`Honest read — ${who}`, `<p class="text-sm">${escapeHtml(b.brutal_truth_employee)}</p>`));
  if (b.brutal_truth_manager) out.push(card("Honest read — you", `<p class="text-sm">${escapeHtml(b.brutal_truth_manager)}</p>`));
  if ((b.next_actions || []).length) {
    const items = b.next_actions!.map((a) => `<li class="text-sm">${a.when ? escapeHtml(a.when) + ": " : ""}${escapeHtml(a.action || "")}</li>`);
    out.push(card("What to do next", `<ul class="l-stack l-stack--2">${items.join("")}</ul>`));
  }
  // Promises loop phase 3: the agreements the manager confirmed at wrap-up, with the
  // outcome tapped at the next check-in. Shown only when the run armed the loop.
  const promiseList = renderPromiseList(promises);
  if (promiseList) out.push(card("Promises & follow-through", promiseList));
  if ((b.watch_for || []).length) out.push(card("Reminders", bullets(b.watch_for!)));
  return out.join("") || none;
}
