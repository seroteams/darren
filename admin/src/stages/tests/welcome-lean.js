// Test: "The welcome screen. Leaner, five ways" — Carl, 2026-07-27: the shipped welcome
// "is too big... something short and more simple, not overlong", and it has to push hard
// to actually RUN a 1:1 while still teaching what a good prep, brief and focus points
// come from. Mock only: hardcoded copy, zero API calls, nothing saved, no routing.
//
// What the shipped screen (start-welcome.ts) costs, measured off the live screenshot
// rather than taste:
//   1 · It is three full screens tall. Headline, video, an eight-cell complaint grid,
//       then the sample brief. A manager who came to prep a 1:1 has to scroll past an
//       argument before they can start one.
//   2 · The four pains are the loudest block on the page. That is a landing page for
//       someone deciding whether to buy, and this manager already signed up.
//   3 · The one blue action is at the top, then never appears again through two more
//       screens of reading. Whoever scrolls has to scroll back.
//   4 · "Focus points" and "it gets better as you use it" are the two things worth
//       knowing and neither is on the screen.
//
// The five bets, deliberately different, not five paint jobs:
//   A · One screen, one job — headline, one line, button, three word-sized proofs. The
//                             floor: how little can carry the meaning.
//   B · Start typing        — the input box IS the page. Don't explain it, start them.
//   C · Three focus points  — show the real output as three lines. Bet: the shape of the
//                             brief teaches faster than any description of it.
//   D · Notes in, brief out — one card, scrappy notes on the left, focus points on the
//                             right. Bet: the transform is the entire pitch.
//   E · It compounds        — leads on the reason to keep going, not the first run. Bet:
//                             "sharper every time" is what makes this a habit not a tool.
//
// The brief quoted in C is the real seeded example, imported from start-welcome.ts, so
// this prototype can never drift from shipped copy. House rules: UK English, plain
// words, no em dashes, 14px floor.

import { SAMPLE_BRIEF } from "../start-welcome.ts";

// The rough notes that produced that brief. Written the way a hurried manager types:
// fragments, no capitals, no punctuation to speak of.
const SAMPLE_NOTES = `sofia flat in design reviews lately
shipped checkout fine but quiet in the crits
mid level, wants to lead a project`;

const STYLE = `
  .wl-wrap { display:flex; flex-direction:column; gap:var(--sero-space-5); }

  /* Prototype chrome */
  .wl-bar { display:flex; flex-wrap:wrap; gap:var(--sero-space-5); align-items:flex-end; }
  .wl-seg-wrap { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wl-seg-label { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); }
  .wl-seg { display:inline-flex; flex-wrap:wrap; gap:var(--sero-space-0-5);
    padding:var(--sero-space-0-5); background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-sm); }
  .wl-seg__btn { font:inherit; font-size:var(--type-body-sm);
    font-weight:var(--type-weight-medium); color:var(--color-ink-dim);
    background:transparent; border:none; border-radius:var(--sero-radius-sm);
    padding:var(--sero-space-1) var(--sero-space-3); cursor:pointer; white-space:nowrap; }
  .wl-seg__btn:hover { color:var(--color-ink); }
  .wl-seg__btn[aria-pressed="true"] { background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-weight:var(--type-weight-semibold); }
  .wl-seg__btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .wl-note { margin:0; max-width:var(--measure-lede); font-size:var(--type-body-sm);
    color:var(--color-ink-dim); line-height:var(--type-leading-normal); }
  .wl-note b { color:var(--color-ink); font-weight:var(--type-weight-semibold); }

  /* The framed screen. The dashed line sits where a 13 inch laptop stops showing the
     page, so "too big" is a thing you can see rather than argue about. */
  .wl-frame { position:relative; border:1px solid var(--color-border);
    border-radius:var(--radius-frame); overflow:hidden; background:var(--color-bg);
    box-shadow:var(--shadow-lift); }
  .wl-frame--phone { max-width:390px; margin-inline:auto; }
  .wl-screen { min-height:700px; padding:clamp(var(--sero-space-5), 4vw, var(--sero-space-10));
    box-sizing:border-box; }
  .wl-frame--phone .wl-screen { min-height:760px; padding:var(--sero-space-5); }
  .wl-fold { position:absolute; left:0; right:0; top:640px; border-top:1px dashed
    var(--color-border); pointer-events:none; }
  .wl-frame--phone .wl-fold { top:700px; }
  .wl-fold span { position:absolute; right:var(--sero-space-3); top:4px;
    font-size:var(--type-body-sm); color:var(--color-ink-mute); }

  /* Shared pieces */
  .wl-eyebrow { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wider); text-transform:uppercase;
    color:var(--color-accent-dark); }
  .wl-h1 { margin:0; font-family:var(--type-family-display); font-size:var(--type-h1);
    font-weight:var(--type-weight-semibold); line-height:var(--type-leading-tight);
    letter-spacing:var(--type-tracking-tight); color:var(--color-ink);
    max-width:18ch; }
  .wl-lede { margin:0; font-size:var(--type-body-lg); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); max-width:46ch; }
  .wl-head { display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .wl-cta-row { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-4); }
  .wl-btn { font:inherit; font-size:var(--type-body-lg);
    font-weight:var(--type-weight-semibold); color:var(--color-surface);
    background:var(--color-accent); border:none; border-radius:var(--sero-radius-sm);
    padding:var(--sero-space-3) var(--sero-space-6); cursor:pointer; }
  .wl-btn:hover { background:var(--color-accent-dark); }
  .wl-btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .wl-frame--phone .wl-btn { width:100%; }
  .wl-time { font-size:var(--type-body-sm); color:var(--color-ink-mute); }
  .wl-link { font:inherit; font-size:var(--type-body-sm);
    font-weight:var(--type-weight-semibold); color:var(--color-accent-dark);
    background:none; border:none; padding:0; cursor:pointer; text-align:left;
    border-radius:var(--sero-radius-sm); }
  .wl-link:hover { text-decoration:underline; }
  .wl-link:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }

  /* A — one screen, one job */
  .wl-a { max-width:600px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-6); padding-top:var(--sero-space-8); }
  .wl-frame--phone .wl-a { padding-top:var(--sero-space-4); }
  .wl-proof { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-3);
    border-top:1px solid var(--color-border); padding-top:var(--sero-space-4); }
  .wl-proof__item { font-size:var(--type-body-sm); color:var(--color-ink);
    display:flex; align-items:center; gap:var(--sero-space-2); }
  .wl-proof__item span { color:var(--color-ink-dim); }
  .wl-proof__sep { color:var(--color-ink-mute); }

  /* B — start typing */
  .wl-b { max-width:640px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-5); padding-top:var(--sero-space-8); }
  .wl-frame--phone .wl-b { padding-top:var(--sero-space-4); }
  .wl-box { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--space-card-pad);
    display:flex; flex-direction:column; gap:var(--sero-space-3);
    box-shadow:var(--shadow-lift); }
  .wl-box__field { font:inherit; font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-relaxed); border:none; resize:none; width:100%;
    min-height:110px; background:transparent; }
  .wl-box__field:focus-visible { outline:none; }
  .wl-box__field::placeholder { color:var(--color-ink-mute); }
  .wl-box__foot { display:flex; flex-wrap:wrap; align-items:center;
    justify-content:space-between; gap:var(--sero-space-3);
    border-top:1px solid var(--color-border); padding-top:var(--sero-space-3); }
  .wl-after { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); max-width:52ch; }

  /* C — three focus points */
  .wl-c { max-width:680px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-5); padding-top:var(--sero-space-6); }
  .wl-frame--phone .wl-c { padding-top:var(--sero-space-3); }
  .wl-brief { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); box-shadow:var(--shadow-lift); overflow:hidden; }
  .wl-brief__head { display:flex; flex-wrap:wrap; align-items:center;
    justify-content:space-between; gap:var(--sero-space-3);
    padding:var(--sero-space-3) var(--space-card-pad);
    border-bottom:1px solid var(--color-border); background:var(--color-bg); }
  .wl-brief__who { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); }
  .wl-tag { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-pill);
    padding:2px var(--sero-space-3); }
  .wl-points { list-style:none; margin:0; padding:var(--space-card-pad);
    display:flex; flex-direction:column; gap:var(--sero-space-4); }
  .wl-point { display:flex; gap:var(--sero-space-3); align-items:flex-start; }
  .wl-point__n { width:24px; height:24px; flex:none; border-radius:var(--sero-radius-pill);
    display:grid; place-items:center; background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-size:var(--type-body-sm);
    font-weight:var(--type-weight-semibold); }
  .wl-point__b { display:flex; flex-direction:column; gap:2px; }
  .wl-point__label { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wide); text-transform:uppercase;
    color:var(--color-ink-mute); }
  .wl-point__text { margin:0; font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-relaxed); }

  /* D — notes in, brief out */
  .wl-d { max-width:900px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-5); padding-top:var(--sero-space-6); }
  .wl-frame--phone .wl-d { padding-top:var(--sero-space-3); }
  .wl-swap { display:grid; grid-template-columns:1fr auto 1fr;
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); box-shadow:var(--shadow-lift); overflow:hidden; }
  .wl-frame--phone .wl-swap { grid-template-columns:1fr; }
  .wl-half { padding:var(--space-card-pad); display:flex; flex-direction:column;
    gap:var(--sero-space-3); }
  .wl-half--in { background:var(--color-bg); }
  .wl-half__cap { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink-dim); }
  .wl-scrappy { margin:0; font-family:var(--type-family-base); font-size:var(--type-body);
    color:var(--color-ink-dim); line-height:var(--type-leading-relaxed);
    white-space:pre-wrap; }
  .wl-arrow { display:grid; place-items:center; padding:0 var(--sero-space-2);
    color:var(--color-accent-dark); font-size:var(--type-h3);
    border-inline:1px solid var(--color-border); background:var(--color-bg); }
  .wl-frame--phone .wl-arrow { border-inline:none; border-block:1px solid var(--color-border);
    padding:var(--sero-space-2) 0; }
  .wl-mini { list-style:none; margin:0; padding:0; display:flex; flex-direction:column;
    gap:var(--sero-space-3); }
  .wl-mini li { font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-normal); }
  .wl-mini b { display:block; font-size:var(--type-body-sm);
    font-weight:var(--type-weight-semibold); color:var(--color-accent-dark); }

  /* E — it compounds */
  .wl-e { max-width:660px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-6); padding-top:var(--sero-space-8); }
  .wl-frame--phone .wl-e { padding-top:var(--sero-space-4); }
  .wl-track { display:flex; flex-direction:column; gap:0;
    border-top:1px solid var(--color-border); }
  .wl-tick { display:grid; grid-template-columns:auto 1fr; gap:var(--sero-space-4);
    align-items:baseline; padding:var(--sero-space-4) 0;
    border-bottom:1px solid var(--color-border); }
  .wl-tick__k { font-family:var(--type-family-display); font-size:var(--type-body-lg);
    font-weight:var(--type-weight-semibold); color:var(--color-accent-dark);
    white-space:nowrap; }
  .wl-tick__v { font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-normal); }
  .wl-tick__v span { display:block; font-size:var(--type-body-sm);
    color:var(--color-ink-dim); }
`;

let option = "a";
let width = "desktop";

const OPTIONS = [
  { id: "a", label: "A · One screen" },
  { id: "b", label: "B · Start typing" },
  { id: "c", label: "C · Focus points" },
  { id: "d", label: "D · Notes in, brief out" },
  { id: "e", label: "E · It compounds" },
];

const NOTES = {
  a: "<b>A · One screen, one job.</b> The floor. Headline, one line, the button, and three word-sized proofs on a rule underneath. Everything else is one click away. Bet: a manager who signed up to prep a 1:1 wants to start one, and the shortest honest screen converts best.",
  b: "<b>B · Start typing.</b> The notes box is on the welcome screen itself, so the first thing they do is type rather than read. The placeholder teaches the input style (fragments, no capitals) by example. Bet: the fastest way to explain simple input is to hand them the box.",
  c: "<b>C · Three focus points.</b> Shows the real output up front as three numbered lines from the seeded example. Bet: the shape of a brief teaches what a good prep is faster than any sentence about it, and three lines is small enough to read standing up.",
  d: "<b>D · Notes in, brief out.</b> One card, split. Scrappy typed notes on the left, the three focus points on the right, one arrow between. Bet: the transform is the entire product and it fits in a single object.",
  e: "<b>E · It compounds.</b> Leads on the reason to keep coming back rather than the first run: run one, five, twenty, and it knows more each time. Bet: managers do not adopt a tool for one meeting, they adopt it for the year.",
};

// ---- shared bits ----------------------------------------------------------------------

const head = (h1, lede) => `
  <div class="wl-head">
    <div class="wl-eyebrow">Welcome to Sero</div>
    <h1 class="wl-h1">${h1}</h1>
    <p class="wl-lede">${lede}</p>
  </div>`;

const cta = (label = "Prep your first 1:1", time = "Two minutes.") => `
  <div class="wl-cta-row">
    <button type="button" class="wl-btn js-noop">${label}</button>
    <span class="wl-time">${time}</span>
  </div>`;

const POINTS = [
  { label: "How to open", text: SAMPLE_BRIEF.open },
  { label: "What to explore", text: SAMPLE_BRIEF.explore },
  { label: "What to listen for", text: SAMPLE_BRIEF.listenFor },
];

const briefCard = () => `
  <div class="wl-brief">
    <div class="wl-brief__head">
      <span class="wl-brief__who">${SAMPLE_BRIEF.name} · ${SAMPLE_BRIEF.meetingType}</span>
      <span class="wl-tag">Example brief</span>
    </div>
    <ol class="wl-points">
      ${POINTS.map(
        (p, i) => `
        <li class="wl-point">
          <span class="wl-point__n">${i + 1}</span>
          <span class="wl-point__b">
            <span class="wl-point__label">${p.label}</span>
            <p class="wl-point__text">${p.text}</p>
          </span>
        </li>`,
      ).join("")}
    </ol>
  </div>`;

// ---- the five screens -----------------------------------------------------------------

const screenA = () => `
  <div class="wl-a">
    ${head(
      "Prep your next 1:1 in two minutes",
      "Type rough notes about the person. Sero gives you the focus points for the conversation.",
    )}
    ${cta()}
    <div class="wl-proof">
      <span class="wl-proof__item">Rough notes in</span>
      <span class="wl-proof__sep">›</span>
      <span class="wl-proof__item">Three focus points out</span>
      <span class="wl-proof__sep">›</span>
      <span class="wl-proof__item">Sharper every 1:1</span>
    </div>
    <div>
      <button type="button" class="wl-link js-noop">See a finished brief</button>
    </div>
  </div>`;

const screenB = () => `
  <div class="wl-b">
    ${head(
      "Who is your next 1:1 with?",
      "Whatever you already know. Half sentences are fine.",
    )}
    <div class="wl-box">
      <textarea class="wl-box__field" placeholder="sofia, product designer, mid level
flat in design reviews lately
shipped checkout fine but quiet in the crits"></textarea>
      <div class="wl-box__foot">
        <span class="wl-time">Two minutes of typing.</span>
        <button type="button" class="wl-btn js-noop">Get my brief</button>
      </div>
    </div>
    <p class="wl-after">Sero asks you two or three questions back, then hands you the focus points for the conversation. Every 1:1 you run makes the next one sharper.</p>
  </div>`;

const screenC = () => `
  <div class="wl-c">
    ${head(
      "Walk in with three focus points",
      "Rough notes go in. This comes out, for the person and the meeting you are actually having.",
    )}
    ${cta()}
    ${briefCard()}
  </div>`;

const screenD = () => `
  <div class="wl-d">
    ${head(
      "This is all it takes",
      "Type what you already know. Sero works out what the conversation is really about.",
    )}
    ${cta()}
    <div class="wl-swap">
      <div class="wl-half wl-half--in">
        <span class="wl-half__cap">What you type</span>
        <p class="wl-scrappy">${SAMPLE_NOTES}</p>
      </div>
      <div class="wl-arrow" aria-hidden="true">→</div>
      <div class="wl-half">
        <span class="wl-half__cap">What you walk in with</span>
        <ul class="wl-mini">
          <li><b>How to open</b>A question about design reviews, not "how are things".</li>
          <li><b>What to explore</b>What is changing her energy, and what a mid level designer needs next.</li>
          <li><b>What to listen for</b>Whether she names a real review, or stays general.</li>
        </ul>
      </div>
    </div>
  </div>`;

const screenE = () => `
  <div class="wl-e">
    ${head(
      "Your 1:1s get sharper every time",
      "Start with rough notes today. Sero keeps what matters and brings it back.",
    )}
    ${cta("Prep your first 1:1", "Two minutes.")}
    <div class="wl-track">
      <div class="wl-tick">
        <span class="wl-tick__k">Today</span>
        <span class="wl-tick__v">Focus points from your notes<span>How to open, what to explore, what to listen for.</span></span>
      </div>
      <div class="wl-tick">
        <span class="wl-tick__k">Next one</span>
        <span class="wl-tick__v">It opens with what you agreed<span>Nothing quietly evaporates between meetings.</span></span>
      </div>
      <div class="wl-tick">
        <span class="wl-tick__k">By month three</span>
        <span class="wl-tick__v">It knows your team<span>Patterns across your people, not one meeting at a time.</span></span>
      </div>
    </div>
  </div>`;

const SCREENS = { a: screenA, b: screenB, c: screenC, d: screenD, e: screenE };

// ---- render + wiring ------------------------------------------------------------------

function render(host) {
  const seg = (name, items, current) =>
    items
      .map(
        (i) =>
          `<button type="button" class="wl-seg__btn" data-${name}="${i.id}" aria-pressed="${i.id === current}">${i.label}</button>`,
      )
      .join("");

  host.innerHTML = `
    <style>${STYLE}</style>
    <div class="wl-wrap">
      <div class="wl-bar">
        <div class="wl-seg-wrap">
          <span class="wl-seg-label">Option</span>
          <div class="wl-seg">${seg("opt", OPTIONS, option)}</div>
        </div>
        <div class="wl-seg-wrap">
          <span class="wl-seg-label">Width</span>
          <div class="wl-seg">${seg(
            "width",
            [
              { id: "desktop", label: "Desktop" },
              { id: "phone", label: "Phone" },
            ],
            width,
          )}</div>
        </div>
      </div>
      <p class="wl-note">${NOTES[option]}</p>
      <div class="wl-frame ${width === "phone" ? "wl-frame--phone" : ""}">
        <div class="wl-screen">${SCREENS[option]()}</div>
        <div class="wl-fold"><span>laptop screen ends here</span></div>
      </div>
    </div>
  `;

  host.querySelectorAll("[data-opt]").forEach((b) =>
    b.addEventListener("click", () => {
      option = b.dataset.opt;
      render(host);
    }),
  );
  host.querySelectorAll("[data-width]").forEach((b) =>
    b.addEventListener("click", () => {
      width = b.dataset.width;
      render(host);
    }),
  );
  host.querySelectorAll(".js-noop").forEach((b) =>
    b.addEventListener("click", (e) => e.preventDefault()),
  );
}

// Mounts into a host element provided by the /test gallery stage.
export function mount(root) {
  option = "a";
  width = "desktop";
  render(root);
}
