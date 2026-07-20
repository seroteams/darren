// Test: "Promises before the recap" — the promises step as its OWN full-screen moment
// between the last question and the recap. Mock only — hardcoded data, zero API/engine
// calls, nothing saved. Opened from the /test gallery.
//
// The "moment" view now renders the REAL component (renderPromiseAgree) so this mock
// always matches what ships — it used to hand-copy the markup, which drifted. Only the
// "payoff" band (the recap's "What you agreed") stays hand-built here, since that lives
// in the recap stage, not in the promises component.
//
//   1 · The moment  — "Lock in what you two agreed": ONE list, task-app style. Each row
//                     carries an owner avatar (tap to flip You ↔ Aisha), the wording, and
//                     its date; add / remove inline; max 10 total. ONE blue action:
//                     "Lock these in". Ghost: "Skip — straight to the recap".
//   2 · The payoff  — the recap's "What you agreed" band. Locked → your list grouped
//                     by owner, yours first. Skipped → today's read-only suggestions
//                     (the fallback), so both paths are visible.
// Design contract: docs/plans/doing/promises-before-recap/plan.md.

import { renderPromiseAgree, draftsFromNextActions } from "../../ui/promise-agree.ts";

// ---- Mock data ---------------------------------------------------------------------------
const NAME = "Aisha";
const CTX_SEGMENTS = [NAME, "junior", "Product designer", "Onboarding check-in"];

// What the engine "heard" — all drafts start owned by the manager (Sero never guesses
// owners; moving a row to Aisha is the manager's call, one tap on the avatar).
const DRAFTS = [
  { action: "Book Aisha's onboarding buddy", when: "this week" },
  { action: "Intro Aisha to the design guild", when: "this month" },
  { action: "Track where her hours actually go for a week", when: "before next 1:1" },
];

// ---- Prototype-only CSS (scoped .pb-) — the PAYOFF band only. The moment view inherits
// the app's real promise-agree.css via the shipped component. -------------------------------
const STYLE = `
  .pb-when { font-size:var(--type-body-sm); color:var(--color-ink-dim);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-full);
    padding:0 10px; white-space:nowrap; }
  .pb-empty { font-size:var(--type-body-sm); color:var(--color-ink-mute); font-style:italic;
    padding:var(--sero-space-2) 0; }

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

// ---- small builders -------------------------------------------------------------------------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ctxHtml = () =>
  CTX_SEGMENTS.map(
    (s, i) => `${i ? `<span class="sep">·</span>` : ""}<span${i === 0 ? ` class="is-strong"` : ""}>${esc(s)}</span>`,
  ).join("");

function payoffHtml(state) {
  const you = (state.locked || []).filter((p) => p.owner === "manager");
  const them = (state.locked || []).filter((p) => p.owner === "report");

  const pact = (p, isYou) => `
    <div class="pb-pact">
      <span class="pb-pill ${isYou ? "pb-pill--you" : "pb-pill--them"}">${isYou ? "You" : esc(NAME)}</span>
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
       ${you.length ? `<span class="pb-owner-label pb-owner-label--you">You promised</span>${you.map((p) => pact(p, true)).join("")}` : ""}
       ${them.length ? `<span class="pb-owner-label">${esc(NAME)} promised</span>${them.map((p) => pact(p, false)).join("")}` : ""}
       ${you.length + them.length === 0 ? `<div class="pb-empty">You locked in an empty list — also allowed.</div>` : ""}
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
  let state = { view: "moment", skipped: false, locked: null };

  const render = () => {
    root.innerHTML = `<style>${STYLE}</style><div class="stage-questioning l-stack l-stack--6"></div>`;
    const stage = root.querySelector(".stage-questioning");

    if (state.view === "moment") {
      // The real shipping component — same call the briefing stage makes.
      renderPromiseAgree(stage, {
        drafts: draftsFromNextActions(DRAFTS),
        reportName: NAME,
        ctxSegments: CTX_SEGMENTS,
        onLock: async (promises) => {
          state.locked = promises;
          state.skipped = false;
          state.view = "payoff";
          render();
          root.scrollIntoView({ block: "start" });
        },
        onSkip: () => {
          state.skipped = true;
          state.view = "payoff";
          render();
          root.scrollIntoView({ block: "start" });
        },
      });
      return;
    }

    stage.innerHTML = payoffHtml(state);
    stage.querySelector("[data-back]")?.addEventListener("click", () => {
      state.view = "moment";
      render();
    });
    stage.querySelector("[data-restart]")?.addEventListener("click", () => {
      state = { view: "moment", skipped: false, locked: null };
      render();
    });
  };

  render();
}
