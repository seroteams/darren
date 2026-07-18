// Test: "Runner v2" — the questioning screen as a TRUE 50/50, Typeform-style. Mock only —
// hardcoded data, zero API/engine calls, nothing saved. Opened from the /test gallery.
//
// Carl's brief (2026-07-18, round 4): the split fills the whole screen. LEFT = the standard
// question design on the quiet paper tint — big stem, notes, actions. RIGHT = a full-bleed
// light-LAVENDER half (design-system lavender, dark text) carrying max THREE hints per
// question — "How to ask" or "Listen for". No panel heading (the eyebrow is enough).
// Live scores live on the lavender half behind an open/close button, closed by default,
// shown as four stat tiles (big delta, direction arrow, colour by direction) instead of
// the grey bars. Tokens only (DESIGN.md); the one blue action stays Submit.
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

// ---- Prototype-only CSS (scoped .rv2-) — the full-screen split. -----------------------------
const STYLE = `
  .rv2-screen { position:fixed; inset:0; z-index:200; display:grid;
    grid-template-columns:1fr 1fr; background:var(--color-page); }
  @media (max-width: 900px) { .rv2-screen { grid-template-columns:1fr;
    grid-template-rows:auto auto; overflow-y:auto; position:absolute; } }

  /* LEFT — the standard runner look, given room to breathe */
  .rv2-left { display:flex; flex-direction:column; overflow-y:auto;
    padding:clamp(20px, 4vw, 56px); }
  .rv2-left__top { display:flex; justify-content:space-between; align-items:flex-start;
    gap:var(--sero-space-3); }
  .rv2-left__mid { flex:1; display:flex; flex-direction:column; justify-content:center;
    gap:var(--sero-space-4); max-width:600px; width:100%;
    padding:var(--sero-space-6) 0; }
  .rv2-stem { font-family:var(--type-family-display); font-weight:600;
    color:var(--color-ink); font-size:clamp(28px, 3vw, 40px); line-height:1.15; margin:0; }
  .rv2-actions-row { display:flex; align-items:center; gap:var(--sero-space-2);
    flex-wrap:nowrap; flex:none; }
  .rv2-actions-row .btn { white-space:nowrap; }
  .rv2-left__bottom { display:flex; flex-direction:column; gap:var(--sero-space-3);
    max-width:600px; width:100%; }
  .rv2-mocknote { font-size:14px; color:var(--color-ink-mute); font-style:italic; }

  /* RIGHT — full-bleed light lavender, dark text, no card chrome */
  .rv2-coach { background:var(--sero-lavender-300); color:var(--sero-lavender-900);
    display:flex; flex-direction:column; overflow-y:auto;
    padding:clamp(24px, 5vw, 88px); }
  /* margin:auto pair centres the group when it fits but never clips it when it scrolls */
  .rv2-coach__inner { margin-top:auto; max-width:520px; display:flex; flex-direction:column;
    gap:var(--sero-space-5); transition:opacity .18s ease, transform .18s ease; }
  .rv2-coach__inner.rv2-fade { opacity:0; transform:translateY(6px); }
  @media (prefers-reduced-motion: reduce) {
    .rv2-coach__inner { transition:none; }
    .rv2-coach__inner.rv2-fade { transform:none; }
  }
  .rv2-coach-eyebrow { display:flex; align-items:center; gap:var(--sero-space-2);
    font-size:14px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
    color:var(--sero-lavender-800); }
  .rv2-hints { display:flex; flex-direction:column; }
  .rv2-hint { display:flex; align-items:flex-start; gap:var(--sero-space-4);
    padding:var(--sero-space-5) 0; border-top:1px solid var(--sero-lavender-600); }
  .rv2-hint:first-child { border-top:0; padding-top:0; }
  .rv2-hint__icon { display:grid; place-items:center; width:36px; height:36px; flex:none;
    border-radius:9999px; background:var(--sero-lavender-100);
    color:var(--sero-lavender-800); margin-top:2px; }
  .rv2-hint__body { flex:1; min-width:0; }
  .rv2-pill { display:inline-block; font-size:14px; font-weight:600;
    letter-spacing:.04em; border-radius:9999px; padding:2px 12px; margin-bottom:6px;
    background:var(--sero-lavender-100); color:var(--sero-lavender-800);
    border:1px solid var(--sero-lavender-700); }
  .rv2-hint__text { font-size:18px; line-height:1.5; color:var(--sero-lavender-900); margin:0; }
  .rv2-coach-foot { font-size:14px; color:var(--sero-lavender-800); }

  /* Live scores — four stat tiles behind an open/close button, closed by default */
  .rv2-scores-block { margin-bottom:auto; max-width:520px; margin-top:var(--sero-space-6);
    padding-top:var(--sero-space-4); border-top:1px solid var(--sero-lavender-600);
    display:flex; flex-direction:column; gap:var(--sero-space-3); }
  .rv2-scores-btn { align-self:flex-start; display:inline-flex; align-items:center;
    gap:var(--sero-space-2); }
  .rv2-scores-btn .sero-icon { transition:transform .15s ease; }
  .rv2-scores-btn[aria-expanded="true"] .sero-icon { transform:rotate(180deg); }
  .rv2-ax-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--sero-space-3); }
  .rv2-ax { background:var(--color-surface); border-radius:var(--radius-card);
    padding:var(--sero-space-3) var(--sero-space-4); display:flex; flex-direction:column;
    gap:2px; border:1px solid var(--color-border); }
  .rv2-ax__label { font-size:14px; color:var(--color-ink-dim); }
  .rv2-ax__row { display:flex; align-items:center; gap:var(--sero-space-2); }
  .rv2-ax__value { font-family:var(--type-family-display); font-size:26px; font-weight:600;
    line-height:1.1; color:var(--color-ink-mute); }
  .rv2-ax--up .rv2-ax__value, .rv2-ax--up .sero-icon { color:var(--color-positive-text); }
  .rv2-ax--down .rv2-ax__value, .rv2-ax--down .sero-icon { color:var(--color-negative-text); }
  .rv2-ax .sero-icon { color:var(--color-ink-mute); }
  .rv2-scores-note { font-size:14px; color:var(--sero-lavender-800); }

  /* End scene */
  .rv2-done-wrap { position:fixed; inset:0; z-index:200; display:grid; place-items:center;
    background:var(--sero-lavender-300); padding:var(--sero-space-6); }
  .rv2-done { display:flex; flex-direction:column; align-items:flex-start;
    gap:var(--sero-space-3); max-width:520px; }
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

// Four stat tiles: big delta, direction arrow, colour by direction. "—" until measured.
const axesHtml = (turnIdx) => {
  const values = AXES_BY_TURN[Math.min(turnIdx, AXES_BY_TURN.length - 1)];
  const tiles = AXIS_LABELS.map((label, i) => {
    const v = values[i];
    const dir = v > 0 ? "up" : v < 0 ? "down" : "flat";
    const glyph = v > 0 ? icon(TrendingUp, { size: 18 }) : v < 0 ? icon(TrendingDown, { size: 18 }) : "";
    const value = v === 0 ? "—" : `${v > 0 ? "+" : "−"}${Math.abs(v)}`;
    return `<div class="rv2-ax rv2-ax--${dir}">
      <span class="rv2-ax__label">${label}</span>
      <span class="rv2-ax__row"><span class="rv2-ax__value">${value}</span>${glyph}</span>
    </div>`;
  }).join("");
  return `<div class="rv2-ax-grid">${tiles}</div>
    <p class="rv2-scores-note">Moves as ${CTX_SEGMENTS[0]} answers — it's a live read, not the final briefing.</p>`;
};

const hintRow = (h) => {
  const ask = h.kind === "ask";
  return `<div class="rv2-hint">
    <span class="rv2-hint__icon">${icon(ask ? MessageCircle : Ear, { size: 18 })}</span>
    <div class="rv2-hint__body">
      <span class="rv2-pill">${ask ? "How to ask" : "Listen for"}</span>
      <p class="rv2-hint__text">${h.text}</p>
    </div>
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
        <div class="rv2-left">
          <div class="rv2-left__top">
            <div class="questioning-head min-w-0 space-y-1">
              <p class="turn-label page-header__step">Question ${turnIdx + 1} of ${QUESTIONS.length}</p>
              <div class="question-session-ctx ctx-segments" aria-label="Session context">${ctxHtml()}</div>
            </div>
            <div class="rv2-actions-row">
              <button type="button" class="btn btn--ghost js-exit">Skip to briefing</button>
              <button type="button" class="btn btn--ghost js-gallery">← All tests</button>
            </div>
          </div>
          <div class="rv2-left__mid">
            ${q.followUp ? `<div class="question-drill-hint text-ink-dim">↳ Following up on what you just said.</div>` : ""}
            <h1 class="rv2-stem">${q.name}</h1>
            ${q.description ? `<div class="question-desc">${q.description}</div>` : ""}
            <label class="block">
              <span class="sr-only">Your notes</span>
              <textarea class="textarea textarea--question" rows="5"
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
          <div class="rv2-left__bottom">
            <p class="rv2-mocknote">Mock — nothing is saved. The hints are hand-written for this walk.</p>
          </div>
        </div>
        <aside class="rv2-coach" aria-label="Coaching for this question">
          <div class="rv2-coach__inner js-hints">
            <div class="rv2-coach-eyebrow">${icon(Sparkles, { size: 16 })} In your corner</div>
            <div class="rv2-hints">${q.hints.map(hintRow).join("")}</div>
            <div class="rv2-coach-foot">Coaching only — none of this is shown to ${CTX_SEGMENTS[0]}.</div>
          </div>
          <div class="rv2-scores-block">
            <button type="button" class="btn btn--ghost rv2-scores-btn js-scores-btn"
              aria-expanded="${scoresOpen}">Live scores ${icon(ChevronDown, { size: 16 })}</button>
            <div class="js-scores" ${scoresOpen ? "" : "hidden"}>${axesHtml(turnIdx)}</div>
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

  // Crossfade: fade the coach content out, swap the whole screen, fade the new one in.
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
