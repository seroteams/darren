// The promises moment (promises-before-recap) — a full-screen step between the
// last question and the recap. Seeded from the briefing's next_actions: the engine
// SUGGESTS, the manager confirms; only locked-in rows are stored (no-inference
// ruling). Owners default to "manager" because the engine can't know who owns
// what — the two groups ("You promise" / "{Name} promises") make ownership a
// visible move, not a per-row toggle. Design signed off by Carl 2026-07-19 via
// the /test walk (admin/src/stages/tests/promises-before-recap.js).
// Styles live in styles/design/promise-agree.css.

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

  const rowHtml = (r: Row) => `
    <div class="pa-row" data-id="${r.id}">
      <span class="pa-dot" aria-hidden="true"></span>
      <input class="input pa-input" type="text" maxlength="200" value="${esc(r.action)}"
        placeholder="What was agreed, in your words" aria-label="The agreed action" />
      ${r.when ? `<span class="pa-when">${esc(r.when)}</span>` : ""}
      <button type="button" class="pa-tool js-move"
        title="Move to ${r.owner === "manager" ? `${esc(them)}'s` : "your"} list">→ ${r.owner === "manager" ? esc(them) : "You"}</button>
      <button type="button" class="pa-tool pa-tool--quiet js-remove" aria-label="Remove this agreement">Remove</button>
    </div>`;

  const groupHtml = (owner: Row["owner"]) => {
    const list = rows.filter((r) => r.owner === owner);
    const you = owner === "manager";
    return `
      <section class="pa-group ${you ? "pa-group--you" : ""} space-y-2" aria-label="${you ? "Your promises" : `${esc(them)}'s promises`}">
        <div class="eyebrow">${you ? "You promise" : `${esc(them)} promises`}</div>
        <div class="pa-rows">
          ${list.length ? list.map(rowHtml).join("") : `<div class="pa-empty">Nothing here yet.</div>`}
        </div>
        ${rows.length >= MAX_PROMISES
          ? `<span class="pa-cap">${MAX_PROMISES} of ${MAX_PROMISES} — that's the lot</span>`
          : `<button type="button" class="pa-add js-add" data-owner="${owner}">+ ${you ? "Add one of yours" : `Add one for ${esc(them)}`}</button>`}
      </section>`;
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
            <div class="question-desc">Sero heard these in the conversation. Fix the wording, move each one to whoever owns it — only what you lock in is kept.</div>
          </div>
        </div>
        ${groupHtml("manager")}
        ${groupHtml("report")}
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
      rowEl.querySelector<HTMLInputElement>(".pa-input")?.addEventListener("input", (e) => {
        row.action = (e.target as HTMLInputElement).value;
      });
      rowEl.querySelector(".js-move")?.addEventListener("click", () => {
        row.owner = row.owner === "manager" ? "report" : "manager";
        render();
      });
      rowEl.querySelector(".js-remove")?.addEventListener("click", () => {
        rows.splice(rows.indexOf(row), 1);
        render();
      });
    });
    host.querySelectorAll<HTMLElement>(".js-add").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (rows.length >= MAX_PROMISES) return;
        const owner = btn.dataset.owner === "report" ? "report" as const : "manager" as const;
        rows.push({ owner, action: "", when: "", id: nextId++ });
        render();
        // Drop the cursor straight into the new empty row.
        const inputs = host.querySelectorAll<HTMLInputElement>(".pa-input");
        [...inputs].reverse().find((i) => !i.value)?.focus();
      }));
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
