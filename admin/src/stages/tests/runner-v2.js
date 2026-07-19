// Test: "Runner v2" — the questioning screen as a TRUE 50/50, Typeform-style. Mock only —
// hardcoded data, zero API/engine calls, nothing saved. Opened from the /test gallery.
//
// Round 5 (2026-07-18): rebuilt on a strict grid after Carl's "messy / not on a grid" call.
// The two halves share three datum lines — a 72px header row closed by a full-width hairline,
// a content line both columns start on, and a footer line (mock note left, live scores right).
// Each half has ONE left edge: every element in a column starts on it (no floating icon
// circles). LEFT = paper, the standard runner pieces. RIGHT = light lavender (Carl's pick),
// dark lavender text, max three hints per question tagged "How to ask" / "Listen for",
// live scores as a four-across scoreboard behind an open/close button (closed by default).
// Tokens only (DESIGN.md); the one blue action stays Submit; fixed type scale (no clamp).
// Questions carry no hints field today (closed contract in question.types.ts), so the
// hints here are hand-written mock coaching — wiring real data is a later decision.

import { icon } from "../../ui/icon.js";
import { MessageCircle, Ear, Sparkles, Check, ChevronDown, TrendingUp, TrendingDown } from "lucide";

// ---- Mock data ---------------------------------------------------------------------------
const CTX_SEGMENTS = ["Aisha", "junior", "Product designer", "Bi-weekly 1:1"];

// kind: "ask" = how to deliver the question · "listen" = what to hear in the answer.
const QUESTIONS = [
  {
    name: "Before we dig in — how have the last two weeks actually felt?",
    description: "A read on energy, not a status update.",
    hints: [
      { kind: "ask", text: "Ask it slowly, then stay quiet. The first answer is usually the polite one — the real one follows the pause." },
      { kind: "listen", text: "Energy words — “drained”, “flat”, “buzzing” — rather than a list of tasks." },
      { kind: "listen", text: "A gap between the tone and the words. “Fine” said flatly is worth one gentle follow-up." },
    ],
  },
  {
    name: "If you had to name this sprint's single most important thing, what would it be?",
    description: "One thing, not a list — the hesitation is the data.",
    hints: [
      { kind: "ask", text: "Hold them to ONE. If they offer three, ask which one they'd protect if the week got cut in half." },
      { kind: "listen", text: "Whether their answer matches yours. A mismatch is a clarity gap, not a performance problem." },
    ],
  },
  {
    name: "You said the review cycle felt heavy — where exactly does the time go?",
    description: "Map the steps before touching any fixes.",
    followUp: true,
    hints: [
      { kind: "ask", text: "Use their exact word back — “heavy” — so they know it landed." },
      { kind: "ask", text: "Don't offer a fix yet. Walk the process step by step first." },
      { kind: "listen", text: "Named steps with owners. If it stays vague, they can't see the process either — that IS the finding." },
    ],
  },
  {
    name: "What's something you'd like to be trusted with that you aren't yet?",
    description: "An ambition question, asked sideways.",
    hints: [
      { kind: "ask", text: "If they blank, offer an example from THEIR recent work, not from yours." },
      { kind: "listen", text: "The size of the ask. A tiny ask can mean low confidence, not low ambition." },
      { kind: "listen", text: "If “trusted” turns into a person's name, you've found a relationship thread — note it." },
    ],
  },
  {
    name: "Anything we should agree on before we wrap?",
    description: "Turn the talk into one or two small promises.",
    final: true,
    hints: [
      { kind: "ask", text: "Keep it to two promises at most — one yours, one theirs. More than that and none survive." },
      { kind: "listen", text: "Vague verbs — “look into”, “try to”. Pin a WHEN to each promise before you close." },
    ],
  },
];

// Live-scores read per turn (static mock — values drift as the 1:1 progresses).
const AXES_BY_TURN = [
  [0, 0, 0, 0],
  [-1, 0, 0, 0],
  [-1, 1, 1, 0],
  [-1, 1, 1, 0],
  [-1, 2, 1, 1],
];
const AXIS_LABELS = ["Wellbeing", "Engagement", "Clarity", "Growth"];

// ---- Prototype-only CSS (scoped .rv2-) ------------------------------------------------------
// The grid: both halves run header 72px / content 1fr / footer auto, share the same horizontal
// padding and 560px column width, and close the header with a full-width hairline. Three datum
// lines, one left edge per column.
const STYLE = `
  .rv2-screen { position:fixed; inset:0; z-index:200; display:grid;
    grid-template-columns:1fr 1fr; }
  /* Balanced rows: header row and footer row take equal 1fr shares, so the middle row
     (the content) sits at the TRUE centre of the half — same line both sides, any height. */
  .rv2-half { display:grid; grid-template-rows:1fr auto 1fr; min-height:0;
    padding:0 56px; overflow-y:auto; overflow-x:hidden; }
  .rv2-half--q { background:var(--color-page); }
  .rv2-half--coach { background:var(--sero-lavender-300); color:var(--sero-lavender-900); }
  @media (max-width: 900px) {
    .rv2-screen { position:absolute; grid-template-columns:1fr; overflow-y:auto; }
    .rv2-half { overflow:visible; padding:0 24px 24px; grid-template-rows:auto auto auto; }
  }

  /* Datum 1 — the header row, closed by a hairline that runs across both halves */
  .rv2-head { display:flex; align-items:center; justify-content:space-between;
    gap:var(--sero-space-4); border-bottom:1px solid var(--color-border);
    height:72px; align-self:start; }
  .rv2-half--coach .rv2-head { border-bottom-color:var(--sero-lavender-600); }
  .rv2-head__facts { display:flex; align-items:baseline; gap:var(--sero-space-3);
    min-width:0; flex:1; white-space:nowrap; }
  .rv2-head__turn { font-size:14px; font-weight:600; color:var(--color-ink); flex:none; }
  .rv2-head .ctx-segments { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; }
  .rv2-head__actions { display:flex; gap:var(--sero-space-2); flex:none; }
  .rv2-head__actions .btn { white-space:nowrap; }
  .rv2-eyebrow { display:inline-flex; align-items:center; gap:var(--sero-space-2);
    font-size:14px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
    color:var(--sero-lavender-800); }
  .rv2-head__note { font-size:14px; color:var(--sero-lavender-800); }

  /* Datum 2 — the middle row: both columns' midpoints share the half's exact centre */
  .rv2-col { padding:40px 0; width:100%; max-width:560px; min-width:0;
    display:flex; flex-direction:column; align-items:flex-start; }
  @media (max-width: 900px) { .rv2-col { padding:24px 0; } }

  .rv2-drill { font-size:14px; color:var(--color-ink-dim); margin:0 0 var(--sero-space-3); }
  .rv2-stem { font-family:var(--type-family-display); font-weight:600;
    color:var(--color-ink); font-size:32px; line-height:1.2; margin:0; }
  .rv2-desc { font-size:16px; color:var(--color-ink-dim); margin:var(--sero-space-2) 0 0; }
  .rv2-col .block { width:100%; margin-top:var(--sero-space-5); }
  .rv2-col .field__actions { margin-top:var(--sero-space-4); }

  /* Coach column — one left edge: pill row, then text, hairline between hints */
  .rv2-hint { width:100%; padding:var(--sero-space-5) 0;
    border-top:1px solid var(--sero-lavender-600); }
  .rv2-hint:first-child { border-top:0; padding-top:0; }
  .rv2-pill { display:inline-flex; align-items:center; gap:var(--sero-space-2);
    font-size:14px; font-weight:600; border-radius:9999px; padding:3px 12px;
    background:var(--sero-lavender-100); color:var(--sero-lavender-800); }
  .rv2-hint__text { font-size:17px; line-height:1.55; color:var(--sero-lavender-900);
    margin:var(--sero-space-2) 0 0; max-width:62ch; }
  .rv2-hints { width:100%; transition:opacity .18s ease; }
  .rv2-hints.rv2-fade { opacity:0; }
  @media (prefers-reduced-motion: reduce) { .rv2-hints { transition:none; } }

  /* Datum 3 — the footer line: mock note left, live scores right */
  .rv2-foot { display:flex; flex-direction:column; justify-content:flex-end;
    align-items:flex-start; gap:var(--sero-space-3); padding:var(--sero-space-5) 0
    var(--sero-space-6); width:100%; max-width:560px; align-self:end; }
  .rv2-mocknote { font-size:14px; color:var(--color-ink-mute); font-style:italic; margin:0; }
  .rv2-quiet { font:inherit; font-size:14px; font-style:normal; color:var(--color-ink-dim);
    background:none; border:0; padding:0; margin-left:var(--sero-space-3); cursor:pointer;
    text-decoration:underline; text-underline-offset:3px; }
  .rv2-quiet:hover { color:var(--color-ink); }
  .rv2-scores-btn { display:inline-flex; align-items:center; gap:var(--sero-space-2); }
  .rv2-scores-btn .sero-icon { transition:transform .15s ease; }
  .rv2-scores-btn[aria-expanded="true"] .sero-icon { transform:rotate(180deg); }
  .rv2-ax-grid { display:grid; grid-template-columns:repeat(4, 1fr);
    gap:var(--sero-space-3); width:100%; }
  @media (max-width: 1240px) { .rv2-ax-grid { grid-template-columns:repeat(2, 1fr); } }
  .rv2-ax { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-3) var(--sero-space-4);
    display:flex; flex-direction:column; gap:2px; }
  .rv2-ax__label { font-size:14px; color:var(--color-ink-dim); }
  .rv2-ax__row { display:flex; align-items:center; gap:var(--sero-space-1); }
  .rv2-ax__value { font-size:20px; font-weight:600; line-height:1.2;
    color:var(--color-ink-mute); }
  .rv2-ax--up .rv2-ax__value, .rv2-ax--up .sero-icon { color:var(--color-positive-text); }
  .rv2-ax--down .rv2-ax__value, .rv2-ax--down .sero-icon { color:var(--color-negative-text); }

  /* End scene */
  .rv2-done-wrap { position:fixed; inset:0; z-index:200; display:grid; place-items:center;
    background:var(--sero-lavender-300); padding:var(--sero-space-6); }
  .rv2-done { display:flex; flex-direction:column; align-items:flex-start;
    gap:var(--sero-space-3); max-width:560px; }
  .rv2-done__glyph { display:grid; place-items:center; width:44px; height:44px;
    border-radius:9999px; background:var(--sero-lavender-100);
    color:var(--sero-lavender-800); }
  .rv2-done .rv2-stem, .rv2-done p { color:var(--sero-lavender-900); }
`;

// ---- small builders ------------------------------------------------------------------------
const ctxHtml = () =>
  CTX_SEGMENTS.map(
    (s, i) => `${i ? `<span class="sep">·</span>` : ""}<span${i === 0 ? ` class="is-strong"` : ""}>${s}</span>`,
  ).join("");

// Four-across scoreboard: label, delta, direction arrow. "—" until measured.
const axesHtml = (turnIdx) => {
  const values = AXES_BY_TURN[Math.min(turnIdx, AXES_BY_TURN.length - 1)];
  const tiles = AXIS_LABELS.map((label, i) => {
    const v = values[i];
    const dir = v > 0 ? "up" : v < 0 ? "down" : "flat";
    const glyph = v > 0 ? icon(TrendingUp, { size: 16 }) : v < 0 ? icon(TrendingDown, { size: 16 }) : "";
    const value = v === 0 ? "—" : `${v > 0 ? "+" : "−"}${Math.abs(v)}`;
    return `<div class="rv2-ax rv2-ax--${dir}">
      <span class="rv2-ax__label">${label}</span>
      <span class="rv2-ax__row"><span class="rv2-ax__value">${value}</span>${glyph}</span>
    </div>`;
  }).join("");
  return `<div class="rv2-ax-grid">${tiles}</div>`;
};

const hintRow = (h) => {
  const ask = h.kind === "ask";
  return `<div class="rv2-hint">
    <span class="rv2-pill">${icon(ask ? MessageCircle : Ear, { size: 16 })}${ask ? "How to ask" : "Listen for"}</span>
    <p class="rv2-hint__text">${h.text}</p>
  </div>`;
};

// ---- mount ---------------------------------------------------------------------------------
export function mount(host) {
  let turnIdx = 0;
  let scoresOpen = false;
  const notes = QUESTIONS.map(() => "");

  // The mock lives in a fixed overlay (the split must fill the screen), so the gallery's
  // own "← All tests" sits underneath — the overlay's exit button clicks it for us.
  const exitToGallery = () => document.querySelector(".js-all-tests")?.click();

  const render = () => {
    if (turnIdx >= QUESTIONS.length) return renderDone();
    const q = QUESTIONS[turnIdx];
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="rv2-screen">
        <div class="rv2-half rv2-half--q">
          <header class="rv2-head">
            <div class="rv2-head__facts">
              <span class="rv2-head__turn">Question ${turnIdx + 1} of ${QUESTIONS.length}</span>
              <span class="ctx-segments" aria-label="Session context">${ctxHtml()}</span>
            </div>
            <div class="rv2-head__actions">
              <button type="button" class="btn btn--ghost js-exit">Skip to briefing</button>
            </div>
          </header>
          <div class="rv2-col">
            ${q.followUp ? `<p class="rv2-drill">↳ Following up on what you just said.</p>` : ""}
            <h1 class="rv2-stem">${q.name}</h1>
            ${q.description ? `<p class="rv2-desc">${q.description}</p>` : ""}
            <label class="block">
              <span class="sr-only">Your notes</span>
              <textarea class="textarea textarea--question" rows="4"
                placeholder="Jot what they said — your shorthand, not a transcript"
                aria-label="Your notes"></textarea>
            </label>
            <div class="field__actions">
              <button class="btn js-submit">${q.final ? "Agree next actions" : "Submit answer"}</button>
              ${q.final
                ? `<button class="btn btn--ghost js-skip" type="button">Finish — skip agreeing</button>`
                : `<button class="btn btn--ghost js-skip" type="button">Skip</button>`}
              ${turnIdx > 0 ? `<button class="btn btn--ghost js-back" type="button">Back</button>` : ""}
            </div>
          </div>
          <div class="rv2-foot">
            <p class="rv2-mocknote">Mock — nothing is saved. The hints are hand-written for this walk.
              <button type="button" class="rv2-quiet js-gallery">← All tests</button></p>
          </div>
        </div>
        <aside class="rv2-half rv2-half--coach" aria-label="Coaching for this question">
          <header class="rv2-head">
            <span class="rv2-eyebrow">${icon(Sparkles, { size: 16 })} In your corner</span>
            <span class="rv2-head__note">Only you see this — never ${CTX_SEGMENTS[0]}.</span>
          </header>
          <div class="rv2-col">
            <div class="rv2-hints js-hints">${q.hints.map(hintRow).join("")}</div>
          </div>
          <div class="rv2-foot">
            <button type="button" class="btn btn--ghost rv2-scores-btn js-scores-btn"
              aria-expanded="${scoresOpen}">Live scores ${icon(ChevronDown, { size: 16 })}</button>
            <div class="js-scores" style="width:100%" ${scoresOpen ? "" : "hidden"}>${axesHtml(turnIdx)}</div>
          </div>
        </aside>
      </div>`;

    const ta = host.querySelector("textarea");
    ta.value = notes[turnIdx];
    ta.addEventListener("input", () => { notes[turnIdx] = ta.value; });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); advance(1); }
    });

    const scoresPanel = host.querySelector(".js-scores");
    const scoresBtn = host.querySelector(".js-scores-btn");
    scoresBtn.addEventListener("click", () => {
      scoresOpen = !scoresOpen;
      scoresPanel.hidden = !scoresOpen;
      scoresBtn.setAttribute("aria-expanded", String(scoresOpen));
    });

    host.querySelector(".js-submit").addEventListener("click", () => advance(1));
    host.querySelector(".js-skip").addEventListener("click", () => advance(1));
    host.querySelector(".js-back")?.addEventListener("click", () => advance(-1));
    host.querySelector(".js-exit").addEventListener("click", () => { turnIdx = QUESTIONS.length; render(); });
    host.querySelector(".js-gallery").addEventListener("click", exitToGallery);
  };

  // Question change: brief fade on the hints (state change, nothing decorative).
  const advance = (dir) => {
    const hints = host.querySelector(".js-hints");
    if (hints) hints.classList.add("rv2-fade");
    setTimeout(() => {
      turnIdx = Math.max(0, turnIdx + dir);
      render();
      const next = host.querySelector(".js-hints");
      if (next) {
        next.classList.add("rv2-fade");
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("rv2-fade")));
      }
    }, 180);
  };

  const renderDone = () => {
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="rv2-done-wrap">
        <div class="rv2-done">
          <span class="rv2-done__glyph">${icon(Check, { size: 22 })}</span>
          <h1 class="rv2-stem">That's the walk.</h1>
          <p>Five questions, each with its own coaching on the lavender half — how to ask it, and what to listen for.</p>
          <div class="field__actions">
            <button class="btn btn--ghost js-restart" type="button">Start again</button>
            <button class="btn btn--ghost js-gallery" type="button">← All tests</button>
          </div>
        </div>
      </div>`;
    host.querySelector(".js-restart").addEventListener("click", () => { turnIdx = 0; render(); });
    host.querySelector(".js-gallery").addEventListener("click", exitToGallery);
  };

  render();
}
