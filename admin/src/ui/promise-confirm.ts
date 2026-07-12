// The wrap-up confirm card (Promises loop phase 1). Seeded from the briefing's
// next_actions — the engine SUGGESTS, the manager confirms; only locked-in rows are
// stored (no-inference ruling). Owners default to "manager" because the engine can't
// know who owns what — the You/them toggle is the manager's one-tap correction.
// Styles live in styles/design/promise-confirm.css.

export interface PromiseDraft {
  owner: "manager" | "report";
  action: string;
  when: string;
}

// Pure: briefing.next_actions (untrusted shape) → editable drafts. Mirrors the
// server's validation (trimmed non-empty action, max 10).
export function draftsFromNextActions(nextActions: unknown): PromiseDraft[] {
  if (!Array.isArray(nextActions)) return [];
  const drafts: PromiseDraft[] = [];
  for (const raw of nextActions) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const action = typeof r.action === "string" ? r.action.trim() : "";
    if (!action) continue;
    drafts.push({ owner: "manager", action, when: typeof r.when === "string" ? r.when.trim() : "" });
    if (drafts.length === 10) break;
  }
  return drafts;
}

export interface PromiseConfirmOpts {
  drafts: PromiseDraft[];
  reportName: string; // the roster person's name — labels the "them" side of the toggle
  onLock: (promises: PromiseDraft[]) => Promise<void>;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Renders the interactive confirm card into `host`. Manages its own draft state;
// on lock it calls onLock and swaps to a quiet saved note. Failures stay soft —
// the manager can retry, and skipping costs nothing.
export function renderPromiseConfirm(host: HTMLElement, opts: PromiseConfirmOpts): void {
  const drafts = opts.drafts.map((d) => ({ ...d }));
  const them = opts.reportName || "them";

  const rowHtml = (d: PromiseDraft, i: number) => `
    <div class="pc-row" data-i="${i}">
      <div class="pc-owner" role="group" aria-label="Who owns this">
        <button type="button" class="pc-owner__btn js-own-manager ${d.owner === "manager" ? "is-active" : ""}" aria-pressed="${d.owner === "manager"}">You</button>
        <button type="button" class="pc-owner__btn js-own-report ${d.owner === "report" ? "is-active" : ""}" aria-pressed="${d.owner === "report"}">${esc(them)}</button>
      </div>
      <input class="input pc-input" type="text" maxlength="200" value="${esc(d.action)}" aria-label="The agreed action" />
      ${d.when ? `<span class="pc-when">${esc(d.when)}</span>` : ""}
      <button type="button" class="btn btn--ghost btn--sm js-remove" aria-label="Remove this agreement">Remove</button>
    </div>`;

  const render = () => {
    if (!drafts.length) {
      host.innerHTML = `<p class="pc-empty text-ink-dim">Nothing left to confirm — the briefing's suggestions are below.</p>`;
      return;
    }
    host.innerHTML = `
      <p class="pc-lead text-ink-dim">Sero heard these in the conversation. Fix the wording, set who owns what — only what you lock in is kept.</p>
      <div class="pc-rows">${drafts.map(rowHtml).join("")}</div>
      <div class="field__actions pc-actions">
        <button type="button" class="btn js-lock">Lock these in</button>
        <span class="pc-note text-sm text-ink-mute">They come back at the start of your next 1:1 with ${esc(them)}.</span>
      </div>
      <span class="pc-status text-sm text-ink-mute" role="status" aria-live="polite"></span>`;
    wire();
  };

  function wire(): void {
    host.querySelectorAll<HTMLElement>(".pc-row").forEach((row) => {
      const i = Number(row.dataset.i);
      row.querySelector(".js-own-manager")?.addEventListener("click", () => { drafts[i]!.owner = "manager"; render(); });
      row.querySelector(".js-own-report")?.addEventListener("click", () => { drafts[i]!.owner = "report"; render(); });
      row.querySelector(".js-remove")?.addEventListener("click", () => { drafts.splice(i, 1); render(); });
      row.querySelector<HTMLInputElement>(".pc-input")?.addEventListener("input", (e) => {
        drafts[i]!.action = (e.target as HTMLInputElement).value;
      });
    });
    host.querySelector(".js-lock")?.addEventListener("click", () => {
      const status = host.querySelector<HTMLElement>(".pc-status");
      const confirmed = drafts
        .map((d) => ({ ...d, action: d.action.trim() }))
        .filter((d) => d.action);
      void (async () => {
        try {
          await opts.onLock(confirmed);
          host.innerHTML = `<div class="pc-saved">✓&nbsp; Locked in — ${confirmed.length ? `these come back at the start of your next 1:1 with ${esc(them)}.` : "nothing kept this time."}</div>`;
        } catch {
          if (status) status.textContent = "Couldn't save — try again, or just finish (skipping costs nothing).";
        }
      })();
    });
  }

  render();
}
