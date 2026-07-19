// Test: "Promises before the recap" — the promises step as its OWN full-screen moment
// between the last question and the recap. Mock only — hardcoded data, zero API/engine
// calls, nothing saved. Opened from the /test gallery.
//
// Two views, advanced by the step's own actions:
//   1 · The moment  — "Lock in what you two agreed": TWO owner groups (You promise /
//                     Aisha promises). Rows edit in place, move across groups, remove;
//                     add per group; max 10 total. ONE blue action: "Lock these in".
//                     Ghost: "Skip — straight to the recap".
//   2 · The payoff  — the recap's "What you agreed" band. Locked → your list grouped
//                     by owner, yours first. Skipped → today's read-only suggestions
//                     (the fallback), so both paths are visible.
// Design contract: docs/plans/doing/promises-before-recap/plan.md. Built with the
// app's real classes so it inherits the true runner look.

// ---- Mock data ---------------------------------------------------------------------------
const NAME = "Aisha";
const CTX_SEGMENTS = [NAME, "junior", "Product designer", "Onboarding check-in"];
const MAX_TOTAL = 10;

// What the engine "heard" — all drafts start in the manager's group (Sero never guesses
// owners; moving a row to Aisha is the manager's call).
const DRAFTS = [
  { action: "Book Aisha's onboarding buddy", when: "this week" },
  { action: "Intro Aisha to the design guild", when: "this month" },
  { action: "Track where her hours actually go for a week", when: "before next 1:1" },
];

// ---- Prototype-only CSS (scoped .pb-) — group cards, rows, payoff band. Everything else
// comes from the app's real stylesheets. -----------------------------------------------------
const STYLE = `
  .pb-group { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4) var(--sero-space-5) var(--sero-space-3); }
  .pb-group--you { border-color:var(--color-primary-line);
    background:linear-gradient(180deg, var(--sero-primary-50), var(--color-surface)); }
  .pb-group .eyebrow { letter-spacing:var(--type-tracking-caps); }
  .pb-group--you .eyebrow { color:var(--color-accent-dark); }

  .pb-row { display:flex; align-items:center; gap:var(--sero-space-3);
    padding:var(--sero-space-3) 0; border-top:1px solid var(--color-border); }
  .pb-row:first-child { border-top:0; }
  .pb-dot { width:8px; height:8px; border-radius:var(--sero-radius-full);
    background:var(--color-accent); flex:none; }
  .pb-text { flex:1; min-width:0; font-size:var(--type-body); color:var(--color-ink);
    border:1px solid transparent; border-radius:var(--radius-input);
    padding:4px 8px; margin:-4px -8px; }
  .pb-text:hover { border-color:var(--color-border-strong); background:var(--color-surface-hover); }
  .pb-text:focus-visible { outline:none; box-shadow:var(--shadow-focus); background:var(--color-surface); }
  .pb-when { font-size:var(--type-body-sm); color:var(--color-ink-dim);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-full);
    padding:0 10px; white-space:nowrap; }
  .pb-tool { font:inherit; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    background:none; cursor:pointer; border:1px solid var(--color-border);
    border-radius:var(--radius-button); padding:4px 10px; white-space:nowrap;
    transition:border-color .12s ease, color .12s ease; }
  .pb-tool:hover { border-color:var(--color-accent); color:var(--color-ink); }
  .pb-tool:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .pb-tool--quiet { border-color:transparent; }
  .pb-add { font:inherit; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    background:none; cursor:pointer; border:1px dashed var(--color-border-strong);
    border-radius:var(--radius-button); padding:6px 14px; margin-top:var(--sero-space-2); }
  .pb-add:hover { color:var(--color-accent-dark); border-color:var(--color-accent); }
  .pb-add[disabled] { opacity:.5; cursor:not-allowed; }
  .pb-cap { font-size:var(--type-body-sm); color:var(--color-ink-mute); }
  .pb-empty { font-size:var(--type-body-sm); color:var(--color-ink-mute); font-style:italic;
    padding:var(--sero-space-2) 0; }

  .pb-loopnote { display:flex; align-items:center; gap:var(--sero-space-2);
    font-size:var(--type-body-sm); color:var(--color-ink-mute); }

  /* payoff band (view 2) */
  .pb-payoff { background:linear-gradient(180deg, var(--sero-offwhite-50) 0%, var(--sero-primary-50) 100%);
    border:1px solid var(--color-border-tinted); border-radius:var(--radius-frame);
    box-shadow:var(--shadow-lift); padding:var(--sero-space-6); }
  .pb-owner-label { display:block; font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-caps); text-transform:uppercase;
    color:var(--color-ink-mute); margin-top:var(--sero-space-4); }
  .pb-owner-label--you { color:var(--color-accent-dark); }
  .pb-pact { display:flex; align-items:center; gap:var(--sero-space-2);
    padding:11px 0; border-bottom:1px solid var(--sero-soft-500); }
  .pb-pact:last-child { border-bottom:0; }
  .pb-pact .txt { flex:1; font-size:var(--type-body-md); font-weight:var(--type-weight-medium);
    color:var(--color-ink); }
  .pb-pill { display:inline-block; font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    border-radius:var(--sero-radius-full); padding:1px 10px; }
  .pb-pill--you { background:var(--sero-primary-200); color:var(--color-accent-dark); }
  .pb-pill--them { background:var(--sero-soft-500); color:var(--color-ink-dim); }
  .pb-locked { display:inline-flex; align-items:center; gap:var(--sero-space-2);
    margin-top:var(--sero-space-4); font-size:var(--type-body-sm); color:var(--color-positive-text);
    background:var(--sero-mint-100); border:1px solid var(--color-mint-line);
    border-radius:var(--radius-button); padding:8px 12px; }
  .pb-mocknote { font-size:var(--type-body-sm); color:var(--color-ink-mute); font-style:italic; }
  .pb-footnav { display:flex; justify-content:space-between; align-items:center;
    margin-top:var(--sero-space-2); }
`;

// ---- small builders (real app classes) -----------------------------------------------------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ctxHtml = () =>
  CTX_SEGMENTS.map(
    (s, i) => `${i ? `<span class="sep">·</span>` : ""}<span${i === 0 ? ` class="is-strong"` : ""}>${esc(s)}</span>`,
  ).join("");

const rowHtml = (p, group, i) => `
  <div class="pb-row" data-group="${group}" data-i="${i}">
    <span class="pb-dot"></span>
    <span class="pb-text" contenteditable="true" spellcheck="false" role="textbox"
      aria-label="Promise wording">${esc(p.action)}</span>
    ${p.when ? `<span class="pb-when">${esc(p.when)}</span>` : ""}
    <button type="button" class="pb-tool" data-move
      title="Move to ${group === "you" ? `${esc(NAME)}'s` : "your"} list">→ ${group === "you" ? esc(NAME) : "You"}</button>
    <button type="button" class="pb-tool pb-tool--quiet" data-remove>Remove</button>
  </div>`;

const groupHtml = (label, group, list, total, addLabel) => `
  <section class="pb-group ${group === "you" ? "pb-group--you" : ""} space-y-2" aria-label="${esc(label)}">
    <div class="eyebrow">${esc(label)}</div>
    <div class="pb-rows">
      ${list.length ? list.map((p, i) => rowHtml(p, group, i)).join("") : `<div class="pb-empty">Nothing here yet.</div>`}
    </div>
    ${
      total >= MAX_TOTAL
        ? `<span class="pb-cap">${MAX_TOTAL} of ${MAX_TOTAL} — that's the lot</span>`
        : `<button type="button" class="pb-add" data-add="${group}">+ ${esc(addLabel)}</button>`
    }
  </section>`;

// ---- the two views ---------------------------------------------------------------------------
function momentHtml(state) {
  const total = state.you.length + state.them.length;
  return `
    <header class="page-header">
      <div class="page-header__row">
        <div class="questioning-head min-w-0 space-y-1">
          <p class="turn-label page-header__step">Before your recap</p>
          <div class="question-session-ctx ctx-segments" aria-label="Session context">${ctxHtml()}</div>
        </div>
      </div>
    </header>
    <div class="card questioning-card space-y-4 reveal">
      <div class="question-card-head">
        <div class="question-card-head__text space-y-2">
          <h1 class="question-stem leading-snug">Lock in what you two agreed</h1>
          <div class="question-desc">Sero heard these in the conversation. Fix the wording, move each one
            to whoever owns it — only what you lock in is kept.</div>
        </div>
      </div>
      ${groupHtml("You promise", "you", state.you, total, "Add one of yours")}
      ${groupHtml(`${NAME} promises`, "them", state.them, total, `Add one for ${NAME}`)}
      <div class="pb-loopnote">↩&nbsp; They come back at the start of your next 1:1 with ${esc(NAME)}.</div>
      <div class="field__actions">
        <button class="btn" data-lock>Lock these in</button>
        <button class="btn btn--ghost" data-skip>Skip — straight to the recap</button>
      </div>
    </div>`;
}

function payoffHtml(state) {
  const pact = (p, you) => `
    <div class="pb-pact">
      <span class="pb-pill ${you ? "pb-pill--you" : "pb-pill--them"}">${you ? "You" : esc(NAME)}</span>
      <span class="txt">${esc(p.action)}</span>
      ${p.when ? `<span class="pb-when">${esc(p.when)}</span>` : ""}
    </div>`;

  const band = state.skipped
    ? `<div class="eyebrow">What to do next</div>
       <div class="pb-owner-label">Sero's suggestions — nothing was locked in</div>
       ${DRAFTS.map((p) => pact(p, true)).join("")}
       <div class="pb-mocknote" style="margin-top:var(--sero-space-3)">(mock) The skip path keeps today's
         read-only list — nothing carries to the next 1:1.</div>`
    : `<div class="eyebrow">What you agreed</div>
       ${state.you.length ? `<span class="pb-owner-label pb-owner-label--you">You promised</span>${state.you.map((p) => pact(p, true)).join("")}` : ""}
       ${state.them.length ? `<span class="pb-owner-label">${esc(NAME)} promised</span>${state.them.map((p) => pact(p, false)).join("")}` : ""}
       ${state.you.length + state.them.length === 0 ? `<div class="pb-empty">You locked in an empty list — also allowed.</div>` : ""}
       <span class="pb-locked">✓ Locked in — these open your next 1:1 with ${esc(NAME)}</span>`;

  return `
    <header class="page-header">
      <div class="page-header__row">
        <div class="questioning-head min-w-0 space-y-1">
          <p class="turn-label page-header__step">Recap</p>
          <div class="question-session-ctx ctx-segments" aria-label="Session context">${ctxHtml()}</div>
        </div>
      </div>
    </header>
    <div class="space-y-4 reveal is-in">
      <div class="pb-payoff">${band}</div>
      <div class="pb-mocknote">(mock) The rest of the recap — the read, the honest read, scores — sits
        around this band exactly as today. The guest PDF's "What to do next" gets the same two blocks.</div>
      <div class="pb-footnav">
        <button class="btn btn--ghost" data-back>← Back to the promises step</button>
        <button class="btn btn--ghost" data-restart>Start over ↻</button>
      </div>
    </div>`;
}

// ---- render + wire ---------------------------------------------------------------------------
// Mounts into a host element provided by the /test gallery stage.
export function mount(root) {
  const fresh = () => ({ view: "moment", skipped: false, you: DRAFTS.map((d) => ({ ...d })), them: [] });
  let state = fresh();

  const render = () => {
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="stage-questioning l-stack l-stack--6">
        ${state.view === "moment" ? momentHtml(state) : payoffHtml(state)}
      </div>`;
    const card = root.querySelector(".questioning-card");
    if (card) requestAnimationFrame(() => card.classList.add("is-in"));
    wire();
  };

  // Pull any in-place edits back into state before re-rendering (contenteditable is DOM-only).
  const syncEdits = () => {
    root.querySelectorAll(".pb-row").forEach((row) => {
      const list = state[row.dataset.group];
      const item = list && list[Number(row.dataset.i)];
      const text = row.querySelector(".pb-text");
      if (item && text) item.action = text.textContent.trim();
    });
  };

  function wire() {
    root.querySelectorAll("[data-move]").forEach((b) =>
      b.addEventListener("click", () => {
        syncEdits();
        const row = b.closest(".pb-row");
        const from = row.dataset.group;
        const to = from === "you" ? "them" : "you";
        const [item] = state[from].splice(Number(row.dataset.i), 1);
        if (item) state[to].push(item);
        render();
      }));
    root.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => {
        syncEdits();
        const row = b.closest(".pb-row");
        state[row.dataset.group].splice(Number(row.dataset.i), 1);
        render();
      }));
    root.querySelectorAll("[data-add]").forEach((b) =>
      b.addEventListener("click", () => {
        syncEdits();
        state[b.dataset.add].push({ action: "", when: "" });
        render();
        // Drop the cursor straight into the new empty row.
        const rows = root.querySelectorAll(`.pb-row[data-group="${b.dataset.add}"] .pb-text`);
        rows[rows.length - 1]?.focus();
      }));
    root.querySelector("[data-lock]")?.addEventListener("click", () => {
      syncEdits();
      state.you = state.you.filter((p) => p.action);
      state.them = state.them.filter((p) => p.action);
      state.view = "payoff";
      state.skipped = false;
      render();
      root.scrollIntoView({ block: "start" });
    });
    root.querySelector("[data-skip]")?.addEventListener("click", () => {
      state.view = "payoff";
      state.skipped = true;
      render();
      root.scrollIntoView({ block: "start" });
    });
    root.querySelector("[data-back]")?.addEventListener("click", () => {
      state.view = "moment";
      render();
    });
    root.querySelector("[data-restart]")?.addEventListener("click", () => {
      state = fresh();
      render();
    });
  }

  render();
}
