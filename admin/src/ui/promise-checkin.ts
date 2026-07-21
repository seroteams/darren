// Card zero — "Before question 1" (Promises loop phase 2). Last time's promises
// come back, the manager's own first, closed off with one tap each: Yes / Partly /
// No / Things changed. The start gate opens once every promise is tapped; a quiet
// skip covers the in-a-rush case (nothing is written back — promises stay open).
// Styles live in styles/design/promise-checkin.css.

import { escapeHtml as esc } from "./html.js";

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

// The start gate: every promise tapped. An empty list is never "all tapped" —
// an empty card must not render in the first place.
export function allTapped(promises: CheckinPromise[], taps: Record<string, string>): boolean {
  return promises.length > 0 && promises.every((p) => Boolean(taps[p.id]));
}

export interface PromiseCheckinOpts {
  promises: CheckinPromise[];
  reportName: string; // labels the "them" side ("Priya will…")
  onDone: (outcomes: Array<{ id: string; outcome: CheckinTap }>) => Promise<void>;
  onSkip: () => void;
}

// Renders the check-in card into `host`. Owns its tap state; onDone is awaited so
// a failed save keeps the card up with a soft retry note (taps intact).
export function renderPromiseCheckin(host: HTMLElement, opts: PromiseCheckinOpts): void {
  const promises = orderForCheckin(opts.promises);
  const them = opts.reportName || "they";
  const taps: Record<string, CheckinTap> = {};

  const rowHtml = (p: CheckinPromise) => `
    <div class="pck-row" data-id="${esc(p.id)}">
      <div class="pck-row__head">
        <span class="chip pck-owner">${p.owner === "manager" ? "You" : esc(them)}</span>
        <span class="pck-action">${esc(p.action)}</span>
        ${p.when ? `<span class="pck-when">${esc(p.when)}</span>` : ""}
      </div>
      <div class="pck-taps" role="group" aria-label="How did it go?">
        ${TAPS.map((t) => `<button type="button" class="pck-tap" data-tap="${t.value}" aria-pressed="false">${t.label}</button>`).join("")}
      </div>
    </div>`;

  host.innerHTML = `
    <p class="pck-lead text-ink-dim">Last time you two agreed on ${promises.length === 1 ? "one thing" : "these"}. A quick tap each before you start.</p>
    <div class="pck-rows">${promises.map(rowHtml).join("")}</div>
    <div class="field__actions pck-actions">
      <button type="button" class="btn js-start" disabled>Start the questions</button>
      <button type="button" class="btn btn--ghost js-skip">Skip for now</button>
    </div>
    <span class="pck-status text-sm text-ink-mute" role="status" aria-live="polite"></span>`;

  const startBtn = host.querySelector<HTMLButtonElement>(".js-start")!;
  const status = host.querySelector<HTMLElement>(".pck-status")!;

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
        startBtn.disabled = !allTapped(promises, taps);
      });
    });
  });

  startBtn.addEventListener("click", () => {
    if (!allTapped(promises, taps)) return;
    startBtn.disabled = true;
    status.textContent = "";
    void (async () => {
      try {
        await opts.onDone(promises.map((p) => ({ id: p.id, outcome: taps[p.id]! })));
      } catch {
        startBtn.disabled = false;
        status.textContent = "Couldn't save the check-in. Try again, or skip for now.";
      }
    })();
  });

  host.querySelector(".js-skip")?.addEventListener("click", () => opts.onSkip());
}
