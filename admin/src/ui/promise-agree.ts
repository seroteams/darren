// The promises moment (promises-before-recap) — a full-screen step between the
// last question and the recap. Seeded from the briefing's next_actions: the engine
// SUGGESTS, the manager confirms; only locked-in rows are stored (no-inference
// ruling). Redrawn 2026-07-20 (Carl) in the language of a task app (Todoist):
// ONE list, no owner groups. Ownership is a tappable avatar — a face for you, an
// initial for them — so moving a promise is one tap in place, not a jump between
// boxes. Same layout desktop and mobile. Styles live in styles/design/promise-agree.css.

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

export const MAX_PROMISES = 10; // mirrors the server ceiling (sessions.service promises())

export interface PromiseAgreeOpts {
  drafts: PromiseDraft[];
  reportName: string; // the roster person's name — labels their group
  ctxSegments?: string[]; // session context line (name · seniority · role · meeting type)
  onLock: (promises: PromiseDraft[]) => Promise<void>;
  onSkip: () => void;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Inline glyphs (no icon-lib dependency in this module; sized via CSS).
const svgUser = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/></svg>`;
const svgX = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const svgCal = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>`;

interface Row extends PromiseDraft {
  id: number;
}

// Renders the full-screen agree step into `host`. Manages its own draft state;
// on lock it calls onLock (async — the caller saves and swaps to the recap view).
// Save failures stay soft: a quiet status line, the manager can retry or skip.
export function renderPromiseAgree(host: HTMLElement, opts: PromiseAgreeOpts): void {
  let nextId = 0;
  const rows: Row[] = opts.drafts.map((d) => ({ ...d, id: nextId++ }));
  const them = opts.reportName || "them";
  const initial = (them.trim()[0] || "•").toUpperCase();

  const rowHtml = (r: Row) => {
    const you = r.owner === "manager";
    return `
    <div class="pa-row" data-id="${r.id}">
      <button type="button" class="pa-av ${you ? "pa-av--you" : "pa-av--them"} js-move"
        aria-label="Owned by ${you ? "you" : esc(them)} — tap to change">${you ? svgUser : esc(initial)}</button>
      <div class="pa-body">
        <div class="pa-input" contenteditable="true" spellcheck="false" role="textbox"
          aria-label="The agreed action" data-placeholder="What was agreed, in your words">${esc(r.action)}</div>
        <div class="pa-meta">
          <span class="pa-who ${you ? "pa-who--you" : "pa-who--them"}">${you ? "You" : esc(them)}</span>
          ${r.when ? `<span class="pa-when">${svgCal}${esc(r.when)}</span>` : ""}
        </div>
      </div>
      <button type="button" class="pa-x js-remove" aria-label="Remove this agreement">${svgX}</button>
    </div>`;
  };

  const listHtml = () => {
    const body = rows.length
      ? rows.map(rowHtml).join("")
      : `<div class="pa-empty">Nothing to lock in yet — add what you two agreed.</div>`;
    const foot = rows.length >= MAX_PROMISES
      ? `<span class="pa-cap">${MAX_PROMISES} of ${MAX_PROMISES} — that's the lot</span>`
      : `<button type="button" class="pa-add js-add"><span class="pa-add__plus" aria-hidden="true">+</span> Add a promise</button>`;
    return `<div class="pa-list">${body}${foot}</div>`;
  };

  const render = () => {
    const ctxLine = (opts.ctxSegments || []).filter(Boolean);
    host.innerHTML = `
      <header class="page-header">
        <div class="questioning-head min-w-0 space-y-1">
          <p class="turn-label page-header__step">Before your recap</p>
          ${ctxLine.length ? `<div class="question-session-ctx ctx-segments" aria-label="Session context">
            ${ctxLine.map((s, i) => `${i ? `<span class="sep">·</span>` : ""}<span${i === 0 ? ` class="is-strong"` : ""}>${esc(s)}</span>`).join("")}
          </div>` : ""}
        </div>
      </header>
      <div class="card questioning-card pa-card space-y-4 is-in">
        <div class="question-card-head">
          <div class="question-card-head__text space-y-2">
            <h1 class="question-stem leading-snug">Lock in what you two agreed</h1>
            <div class="question-desc">Sero heard these in the conversation. Fix the wording, tap a face to set who owns it — only what you lock in is kept.</div>
          </div>
        </div>
        ${listHtml()}
        <div class="pa-loopnote">↩&nbsp; They come back at the start of your next 1:1 with ${esc(them)}.</div>
        <div class="field__actions pa-actions">
          <button type="button" class="btn js-lock">Lock these in</button>
          <button type="button" class="btn btn--ghost js-skip">Skip — straight to the recap</button>
        </div>
        <span class="pa-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
      </div>`;
    wire();
  };

  // Text edits land straight in state (no re-render, focus survives typing).
  const syncRow = (el: HTMLElement): Row | undefined =>
    rows.find((r) => r.id === Number(el.dataset.id));

  function wire(): void {
    host.querySelectorAll<HTMLElement>(".pa-row").forEach((rowEl) => {
      const row = syncRow(rowEl);
      if (!row) return;
      rowEl.querySelector<HTMLElement>(".pa-input")?.addEventListener("input", (e) => {
        row.action = (e.target as HTMLElement).textContent || "";
      });
      // The avatar IS the owner control — tap flips you ↔ them, in place.
      rowEl.querySelector(".js-move")?.addEventListener("click", () => {
        row.owner = row.owner === "manager" ? "report" : "manager";
        render();
      });
      rowEl.querySelector(".js-remove")?.addEventListener("click", () => {
        rows.splice(rows.indexOf(row), 1);
        render();
      });
    });
    host.querySelector(".js-add")?.addEventListener("click", () => {
      if (rows.length >= MAX_PROMISES) return;
      rows.push({ owner: "manager", action: "", when: "", id: nextId++ });
      render();
      // Drop the cursor straight into the new empty row.
      const inputs = host.querySelectorAll<HTMLElement>(".pa-input");
      [...inputs].reverse().find((i) => !i.textContent)?.focus();
    });
    host.querySelector(".js-skip")?.addEventListener("click", () => opts.onSkip());
    host.querySelector(".js-lock")?.addEventListener("click", (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const status = host.querySelector<HTMLElement>(".pa-status");
      const confirmed = rows
        .map(({ owner, action, when }) => ({ owner, action: action.trim(), when }))
        .filter((d) => d.action);
      btn.disabled = true;
      void (async () => {
        try {
          await opts.onLock(confirmed);
        } catch {
          btn.disabled = false;
          if (status) status.textContent = "Couldn't save — try again, or skip (skipping costs nothing).";
        }
      })();
    });
  }

  render();
}
