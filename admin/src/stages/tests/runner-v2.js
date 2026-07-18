// Test: "Runner v2" — the questioning screen as a 50/50 split. Mock only — hardcoded
// data, zero API/engine calls, nothing saved. Opened from the /test gallery.
//
// Carl's idea (2026-07-18): make running questions feel more interesting than the single
// centred card. LEFT = the standard question design (real runner classes, familiar look).
// RIGHT = a light Sero-toned coach panel, dark ink text, max THREE hints per question —
// each tagged "How to ask" (delivery) or "Listen for" (what a good/worrying answer sounds
// like). Hints crossfade as the question changes; the panel keeps the runner's one-blue-
// action rule — Submit stays the only accent on screen.
// Questions carry no hints field today (closed contract in question.types.ts), so the
// hints here are hand-written mock coaching — wiring real data is a later decision.

import { icon } from "../../ui/icon.js";
import { MessageCircle, Ear, Sparkles, Check } from "lucide";

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

// ---- Prototype-only CSS (scoped .rv2-) — the split + coach panel. Everything on the
// left comes from the app's real stylesheets. -----------------------------------------------
const STYLE = `
  .rv2-wrap { max-width:1160px; margin:0 auto; width:100%; }
  .rv2-split { display:grid; grid-template-columns:1fr 1fr; gap:var(--sero-space-5);
    align-items:start; margin-top:var(--sero-space-4); }
  @media (max-width: 900px) { .rv2-split { grid-template-columns:1fr; } }

  .rv2-coach { position:sticky; top:var(--sero-space-5); display:flex;
    flex-direction:column; gap:var(--sero-space-3); padding:var(--sero-space-5); }
  @media (max-width: 900px) { .rv2-coach { position:static; } }
  .rv2-coach-head { display:flex; align-items:center; gap:var(--sero-space-3);
    padding-bottom:var(--sero-space-3); border-bottom:1px solid var(--color-border); }
  .rv2-coach-glyph { display:grid; place-items:center; width:34px; height:34px; flex:none;
    border-radius:var(--radius-button); background:var(--sero-lavender-200);
    color:var(--sero-lavender-800); }
  .rv2-coach-title { font-family:var(--type-family-display); font-size:18px; font-weight:600;
    color:var(--color-ink); }
  .rv2-coach-sub { font-size:14px; color:var(--color-ink-dim); }

  .rv2-hints { display:flex; flex-direction:column; gap:var(--sero-space-3);
    transition:opacity .18s ease, transform .18s ease; }
  .rv2-hints.rv2-fade { opacity:0; transform:translateY(4px); }
  @media (prefers-reduced-motion: reduce) {
    .rv2-hints { transition:none; }
    .rv2-hints.rv2-fade { transform:none; }
  }

  .rv2-hint { display:flex; align-items:flex-start; gap:var(--sero-space-3);
    padding:var(--sero-space-3); border:1px solid var(--color-border);
    border-radius:var(--radius-card); background:var(--sero-primary-100); }
  .rv2-hint__icon { display:grid; place-items:center; width:28px; height:28px; flex:none;
    border-radius:var(--radius-button); margin-top:2px; }
  .rv2-hint__icon--ask { background:var(--sero-primary-200); color:var(--color-accent-dark); }
  .rv2-hint__icon--listen { background:var(--sero-lavender-200); color:var(--sero-lavender-800); }
  .rv2-hint__body { flex:1; min-width:0; }
  .rv2-pill { display:inline-block; font-size:14px; font-weight:600; border-radius:9999px;
    padding:0 10px; margin-bottom:4px; }
  .rv2-pill--ask { background:var(--sero-primary-200); color:var(--color-accent-dark); }
  .rv2-pill--listen { background:var(--sero-lavender-200); color:var(--sero-lavender-800); }
  .rv2-hint__text { font-size:15px; line-height:1.55; color:var(--color-ink); margin:0; }

  .rv2-coach-foot { font-size:14px; color:var(--color-ink-mute); }

  .rv2-done { display:flex; flex-direction:column; align-items:flex-start;
    gap:var(--sero-space-3); }
  .rv2-done__glyph { display:grid; place-items:center; width:40px; height:40px;
    border-radius:9999px; background:var(--sero-mint-100); color:var(--color-positive-text); }
  .rv2-mocknote { font-size:14px; color:var(--color-ink-mute); font-style:italic; }
`;

// ---- small builders ------------------------------------------------------------------------
const ctxHtml = () =>
  CTX_SEGMENTS.map(
    (s, i) => `${i ? `<span class="sep">·</span>` : ""}<span${i === 0 ? ` class="is-strong"` : ""}>${s}</span>`,
  ).join("");

const axesHtml = (turnIdx) => {
  const values = AXES_BY_TURN[Math.min(turnIdx, AXES_BY_TURN.length - 1)];
  const rows = AXIS_LABELS.map((label, i) => {
    const v = values[i];
    if (v === 0) {
      return `<div class="axis"><div class="axis__label">${label}</div>
        <div class="axis__track"><div class="axis__midline"></div><div class="axis__fill axis__fill--neutral"></div></div>
        <div class="axis__value axis__value--baseline">—</div></div>`;
    }
    const dir = v > 0 ? "positive" : "negative";
    return `<div class="axis"><div class="axis__label">${label}</div>
      <div class="axis__track"><div class="axis__midline"></div>
        <div class="axis__fill axis__fill--${dir}" style="transform:scaleX(${Math.abs(v) * 0.25})"></div></div>
      <div class="axis__value">${v > 0 ? "+" : ""}${v}</div></div>`;
  }).join("");
  return `<div class="axes-wrap space-y-2" aria-label="Live scores">
    <div class="eyebrow">Live scores</div><div class="card axes-host">${rows}</div></div>`;
};

const hintRow = (h) => {
  const ask = h.kind === "ask";
  return `<div class="rv2-hint">
    <span class="rv2-hint__icon rv2-hint__icon--${h.kind}">${icon(ask ? MessageCircle : Ear, { size: 16 })}</span>
    <div class="rv2-hint__body">
      <span class="rv2-pill rv2-pill--${h.kind}">${ask ? "How to ask" : "Listen for"}</span>
      <p class="rv2-hint__text">${h.text}</p>
    </div>
  </div>`;
};

// ---- mount ---------------------------------------------------------------------------------
export function mount(host) {
  let turnIdx = 0;
  const notes = QUESTIONS.map(() => "");

  const render = () => {
    if (turnIdx >= QUESTIONS.length) return renderDone();
    const q = QUESTIONS[turnIdx];
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="rv2-wrap stage-questioning l-stack l-stack--4">
        <header class="page-header">
          <div class="page-header__row">
            <div class="questioning-head min-w-0 space-y-1">
              <p class="turn-label page-header__step">Question ${turnIdx + 1} of ${QUESTIONS.length}</p>
              <div class="question-session-ctx ctx-segments" aria-label="Session context">${ctxHtml()}</div>
            </div>
            <button type="button" class="btn btn--ghost js-exit shrink-0">Skip to briefing</button>
          </div>
        </header>
        <div class="rv2-split">
          <div class="rv2-main l-stack l-stack--4">
            <div class="card questioning-card space-y-4">
              ${q.followUp ? `<div class="question-drill-hint text-ink-dim">↳ Following up on what you just said.</div>` : ""}
              <div class="question-card-head">
                <div class="question-card-head__text space-y-2">
                  <h1 class="question-stem leading-snug">${q.name}</h1>
                  ${q.description ? `<div class="question-desc">${q.description}</div>` : ""}
                </div>
              </div>
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
              <p class="hint hint--kbd text-xs text-ink-mute">Enter · Skip · Esc</p>
            </div>
            ${axesHtml(turnIdx)}
          </div>
          <aside class="card rv2-coach" aria-label="Coaching for this question">
            <div class="rv2-coach-head">
              <span class="rv2-coach-glyph">${icon(Sparkles, { size: 18 })}</span>
              <div>
                <div class="rv2-coach-title">In your corner</div>
                <div class="rv2-coach-sub">How to get the most from this question</div>
              </div>
            </div>
            <div class="rv2-hints js-hints">${q.hints.map(hintRow).join("")}</div>
            <div class="rv2-coach-foot">Coaching only — none of this is shown to ${CTX_SEGMENTS[0]}.</div>
          </aside>
        </div>
        <p class="rv2-mocknote">Mock — nothing is saved. The hints are hand-written for this walk.</p>
      </div>`;

    const ta = host.querySelector("textarea");
    ta.value = notes[turnIdx];
    ta.addEventListener("input", () => { notes[turnIdx] = ta.value; });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); advance(1); }
    });

    host.querySelector(".js-submit").addEventListener("click", () => advance(1));
    host.querySelector(".js-skip").addEventListener("click", () => advance(1));
    host.querySelector(".js-back")?.addEventListener("click", () => advance(-1));
    host.querySelector(".js-exit").addEventListener("click", () => { turnIdx = QUESTIONS.length; render(); });
  };

  // Crossfade: fade the hints out, swap the whole screen, fade the new hints in.
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
      window.scrollTo(0, 0);
    }, 180);
  };

  const renderDone = () => {
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="rv2-wrap l-stack l-stack--4">
        <div class="card rv2-done">
          <span class="rv2-done__glyph">${icon(Check, { size: 20 })}</span>
          <h1 class="question-stem">That's the walk.</h1>
          <p class="text-ink-dim">Five questions, each with its own coaching in the right-hand panel — how to ask it, and what to listen for.</p>
          <div class="field__actions">
            <button class="btn btn--ghost js-restart" type="button">Start again</button>
          </div>
        </div>
        <p class="rv2-mocknote">Mock — nothing is saved.</p>
      </div>`;
    host.querySelector(".js-restart").addEventListener("click", () => { turnIdx = 0; render(); });
  };

  render();
}
