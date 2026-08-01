// Last time's actions (Promises loop phase 2, re-placed by action-review-placement
// P1). The promises come back, the manager's own first, closed off with one tap
// each: Done / Partly / Not done / Changed.
//
// It no longer gates the meeting. The card is reached only by choosing it on the
// walk-in screen, so trapping the manager inside it until every row is tapped
// would punish the person who took the offer. Answer what you know, leave the
// rest: an untapped promise is simply not sent, so it stays open on the prior run
// exactly as skipping the card leaves it. Nothing is ever invented.
// Styles live in styles/design/promise-checkin.css.

import { escapeHtml as esc } from "./html.js";
import { button } from "./button.ts";

export interface CheckinPromise {
  id: string;
  owner: "manager" | "report";
  action: string;
  when: string;
  outcome: string | null;
  at: number;
}

export type CheckinTap = "yes" | "partly" | "no" | "changed";

const TAPS: Array<{ value: CheckinTap; label: string }> = [
  { value: "yes", label: "Done" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not done" },
  { value: "changed", label: "Changed" },
];

// Manager's own first (design verdict 2026-07-12 — the leader goes first),
// each side keeping its stored order.
export function orderForCheckin(promises: CheckinPromise[]): CheckinPromise[] {
  return [...promises.filter((p) => p.owner === "manager"), ...promises.filter((p) => p.owner !== "manager")];
}

// Whether every promise has been answered. No longer gates the start button —
// kept because it still describes the complete state. An empty list is never
// "all tapped": an empty card must not render in the first place.
export function allTapped(promises: CheckinPromise[], taps: Record<string, string>): boolean {
  return promises.length > 0 && promises.every((p) => Boolean(taps[p.id]));
}

// What actually gets sent: the tapped rows only, in card order. An untouched
// promise is not an answer and never becomes one (the no-inference ruling).
export function tappedOutcomes(
  promises: CheckinPromise[],
  taps: Record<string, string>,
): Array<{ id: string; outcome: CheckinTap }> {
  return promises
    .filter((p) => Boolean(taps[p.id]))
    .map((p) => ({ id: p.id, outcome: taps[p.id] as CheckinTap }));
}

// The rows and their taps, on their own, so the two places that close last time's
// actions share one implementation: the walk-in offer (below) and the recap step,
// which is where a "Something feels off" 1:1 meets them instead (P2). `taps` is
// owned by the caller and mutated in place, so a host that re-renders around these
// rows (promise-agree does, on every owner flip) never loses what was tapped.
export function renderCheckinRows(
  host: HTMLElement,
  { promises, reportName, taps }: { promises: CheckinPromise[]; reportName: string; taps: Record<string, CheckinTap> },
): void {
  const them = reportName || "they";
  const rowHtml = (p: CheckinPromise) => `
    <div class="pck-row" data-id="${esc(p.id)}">
      <div class="pck-row__head">
        <span class="chip pck-owner">${p.owner === "manager" ? "You" : esc(them)}</span>
        <span class="pck-action">${esc(p.action)}</span>
        ${p.when ? `<span class="pck-when">${esc(p.when)}</span>` : ""}
      </div>
      <div class="pck-taps" role="group" aria-label="How did it go?">
        ${TAPS.map(
          (t) =>
            `<button type="button" class="pck-tap${taps[p.id] === t.value ? " is-active" : ""}" data-tap="${t.value}" aria-pressed="${taps[p.id] === t.value}">${t.label}</button>`,
        ).join("")}
      </div>
    </div>`;

  host.innerHTML = `<div class="pck-rows">${promises.map(rowHtml).join("")}</div>`;

  host.querySelectorAll<HTMLElement>(".pck-row").forEach((row) => {
    const id = row.dataset.id!;
    row.querySelectorAll<HTMLButtonElement>(".pck-tap").forEach((btn) => {
      btn.addEventListener("click", () => {
        taps[id] = btn.dataset.tap as CheckinTap;
        row.querySelectorAll<HTMLButtonElement>(".pck-tap").forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
      });
    });
  });
}

export interface PromiseCheckinOpts {
  promises: CheckinPromise[];
  reportName: string; // labels the "them" side ("Priya will…")
  onDone: (outcomes: Array<{ id: string; outcome: CheckinTap }>) => Promise<void>;
  onSkip: () => void; // nothing tapped: carry on, write nothing, leave them open
}

// Renders the check-in card into `host`. Owns its tap state; onDone is awaited so
// a failed save keeps the card up with a soft retry note (taps intact).
export function renderPromiseCheckin(host: HTMLElement, opts: PromiseCheckinOpts): void {
  const promises = orderForCheckin(opts.promises);
  const taps: Record<string, CheckinTap> = {};

  host.innerHTML = `
    <p class="pck-lead text-ink-dim">Tap what's true. Anything you leave stays open for next time.</p>
    <div class="pck-host"></div>
    <div class="field__actions pck-actions">
      ${button({ label: "Start the questions", hook: "js-start" })}
    </div>
    <span class="pck-status text-sm text-ink-mute" role="status" aria-live="polite"></span>`;

  renderCheckinRows(host.querySelector<HTMLElement>(".pck-host")!, {
    promises,
    reportName: opts.reportName,
    taps,
  });

  const startBtn = host.querySelector<HTMLButtonElement>(".js-start")!;
  const status = host.querySelector<HTMLElement>(".pck-status")!;

  startBtn.addEventListener("click", () => {
    const outcomes = tappedOutcomes(promises, taps);
    // Nothing tapped IS the skip — one control, and no empty answer is ever sent.
    if (outcomes.length === 0) {
      opts.onSkip();
      return;
    }
    startBtn.disabled = true;
    status.textContent = "";
    void (async () => {
      try {
        await opts.onDone(outcomes);
      } catch {
        startBtn.disabled = false;
        status.textContent = "Couldn't save that. Try again.";
      }
    })();
  });
}
