// Test: "The first screen. Five options" — five ways to build the brand-new manager's
// welcome, after Carl rejected the shipped one on 2026-07-26 ("naht this design does not
// work"). Mock only: hardcoded copy, zero API calls, nothing saved, no routing.
//
// What the shipped screen gets wrong, read off the live screenshot rather than taste:
//   1 · Two columns, and the right one is a 16:9 black rectangle. It is the biggest,
//       darkest object on a page whose actual subject is a written brief. The eye goes
//       to the video, and on live the video was broken (Error 153), so the loudest
//       element was an error message.
//   2 · The page ends a third of the way down. Everything sits top-left in a 1400px
//       viewport and the bottom two thirds are empty tint, which reads as unfinished
//       rather than calm.
//   3 · The sample brief is three grey label/paragraph pairs. It is the one thing worth
//       looking at and it is styled like a settings form.
//   4 · Nothing shows the INPUT. A stranger sees a brief but never learns it came from
//       rough typed notes, so "About two minutes of typing" has nothing to attach to.
//   5 · The one blue action is bottom-left, below the fold of attention, competing with
//       a grey sentence set at the same size.
//
// The five are deliberately different bets, not five paint jobs:
//   A · One column      — kill the second column outright, centre everything, demote the
//                         video to a line of text. The smallest change that fixes 1 and 2.
//   B · Brief as hero   — the sample becomes a real-looking document: person header,
//                         bigger type, paper surface. Bets that the artefact sells itself.
//   C · Notes to brief  — shows the input beside the output ("you type this" → "you get
//                         this"), so the two minutes is visible. Bets that the TRANSFORM
//                         is the product, not the brief.
//   D · Balanced split  — keeps two columns but reverses the weight: brief wide on the
//                         left, a short what-happens-next list and a small video card on
//                         the right. Bets the two-column instinct was right, the ratio
//                         was wrong.
//   E · Quiet start     — headline, one line, one button. The sample is one click away
//                         behind "See a finished brief". Bets that a manager who came to
//                         prep a 1:1 wants to start, not to read.
//
// The sample brief quoted here is the real seeded example, imported from start-welcome.ts
// rather than retyped, so this prototype can never drift from the shipped copy.

import { SAMPLE_BRIEF, POSITIONING_LINE, TIME_LINE, VIDEO, videoIframeHtml } from "../start-welcome.ts";

// The rough notes that produced the sample brief. Shown in option C so the input is
// visible. Written the way a hurried manager actually types: fragments, no capitals.
const SAMPLE_NOTES = `sofia seems flat in design reviews lately
shipped the checkout work fine but quiet in the crits
mid level, wants to grow into leading a project`;

const STYLE = `
  .wo-wrap { display:flex; flex-direction:column; gap:var(--sero-space-5); }

  /* Prototype chrome */
  .wo-bar { display:flex; flex-wrap:wrap; gap:var(--sero-space-5); align-items:flex-end; }
  .wo-seg-wrap { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wo-seg-label { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); }
  .wo-seg { display:inline-flex; flex-wrap:wrap; gap:var(--sero-space-0-5);
    padding:var(--sero-space-0-5); background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-sm); }
  .wo-seg__btn { font:inherit; font-size:var(--type-body-sm);
    font-weight:var(--type-weight-medium); color:var(--color-ink-dim);
    background:transparent; border:none; border-radius:var(--sero-radius-sm);
    padding:var(--sero-space-1) var(--sero-space-3); cursor:pointer; white-space:nowrap; }
  .wo-seg__btn:hover { color:var(--color-ink); }
  .wo-seg__btn[aria-pressed="true"] { background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-weight:var(--type-weight-semibold); }
  .wo-seg__btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .wo-note { margin:0; max-width:var(--measure-lede); font-size:var(--type-body-sm);
    color:var(--color-ink-dim); line-height:var(--type-leading-normal); }
  .wo-note b { color:var(--color-ink); font-weight:var(--type-weight-semibold); }

  /* The framed screen. min-height is deliberate: it shows how much page each option
     actually fills, which is finding 2. */
  .wo-frame { border:1px solid var(--color-border); border-radius:var(--radius-frame);
    overflow:hidden; background:var(--color-bg); box-shadow:var(--shadow-lift); }
  .wo-frame--phone { max-width:390px; margin-inline:auto; }
  .wo-screen { min-height:660px; padding:clamp(var(--sero-space-5), 4vw, var(--sero-space-10));
    box-sizing:border-box; }
  .wo-frame--phone .wo-screen { min-height:720px; padding:var(--sero-space-5); }

  /* Shared pieces */
  .wo-eyebrow { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wide); text-transform:uppercase;
    color:var(--color-accent-dark); }
  .wo-h1 { margin:0; font-family:var(--type-family-display); font-size:var(--type-h1);
    font-weight:var(--type-weight-semibold); line-height:var(--type-leading-tight);
    letter-spacing:var(--type-tracking-tight); color:var(--color-ink); }
  .wo-lede { margin:0; font-size:var(--type-body-lg); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); max-width:var(--measure-lede); }
  .wo-time { font-size:var(--type-body-sm); color:var(--color-ink-mute); }
  .wo-cta { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-4); }
  .wo-frame--phone .wo-cta .btn { width:100%; justify-content:center; }

  /* Brief card, plain variant (options A, D, E) */
  .wo-brief { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--space-card-pad);
    display:flex; flex-direction:column; gap:var(--sero-space-4); }
  .wo-brief__head { display:flex; flex-wrap:wrap; align-items:center;
    justify-content:space-between; gap:var(--sero-space-3); }
  .wo-brief__who { font-weight:var(--type-weight-semibold); color:var(--color-ink); }
  .wo-tag { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:var(--color-bg);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-pill);
    padding:var(--sero-space-1) var(--sero-space-3); }
  .wo-row { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wo-row__label { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); }
  .wo-row__text { margin:0; font-size:var(--type-body); color:var(--color-ink-dim);
    line-height:var(--type-leading-relaxed); }
  .wo-link { font:inherit; font-size:var(--type-body-sm);
    font-weight:var(--type-weight-semibold); color:var(--color-accent-dark);
    background:none; border:none; padding:0; cursor:pointer;
    border-radius:var(--sero-radius-sm); text-align:left; }
  .wo-link:hover { text-decoration:underline; }
  .wo-link:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }

  /* A — one centred column */
  .wo-a { max-width:640px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-6); text-align:left; }
  .wo-a__head { display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .wo-a__foot { display:flex; flex-direction:column; gap:var(--sero-space-2);
    border-top:1px solid var(--color-border); padding-top:var(--sero-space-4); }

  /* B — the brief as a document */
  .wo-b { max-width:720px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-5); }
  .wo-doc { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); box-shadow:var(--shadow-lift); overflow:hidden; }
  .wo-doc__banner { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-2);
    background:var(--color-accent-soft); color:var(--color-accent-dark);
    font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    padding:var(--sero-space-2) var(--space-card-pad); }
  .wo-doc__head { display:flex; align-items:center; gap:var(--sero-space-3);
    padding:var(--space-card-pad); border-bottom:1px solid var(--color-border); }
  .wo-avatar { width:44px; height:44px; flex:none; border-radius:var(--sero-radius-pill);
    display:grid; place-items:center; background:var(--sero-mint-300);
    color:var(--sero-mint-900); font-weight:var(--type-weight-semibold); }
  .wo-doc__name { font-family:var(--type-family-display); font-size:var(--type-h3);
    font-weight:var(--type-weight-semibold); color:var(--color-ink); line-height:1.2; }
  .wo-doc__meta { font-size:var(--type-body-sm); color:var(--color-ink-dim); }
  .wo-doc__body { display:flex; flex-direction:column; gap:var(--sero-space-5);
    padding:var(--space-card-pad); }
  .wo-doc__row { display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .wo-doc__label { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wide); text-transform:uppercase;
    color:var(--color-ink-mute); }
  .wo-doc__text { margin:0; font-size:var(--type-body-lg); color:var(--color-ink);
    line-height:var(--type-leading-relaxed); }

  /* C — notes to brief */
  .wo-c { max-width:1000px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-6); }
  .wo-flow { display:grid; grid-template-columns:1fr auto 1fr; gap:var(--sero-space-4);
    align-items:stretch; }
  .wo-frame--phone .wo-flow { grid-template-columns:1fr; }
  .wo-flow__arrow { display:grid; place-items:center; color:var(--color-ink-mute);
    font-size:var(--type-h3); }
  .wo-panel { display:flex; flex-direction:column; gap:var(--sero-space-3);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--space-card-pad); }
  .wo-panel--in { background:var(--color-bg); border-style:dashed; }
  .wo-panel__cap { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink-dim); }
  .wo-notes { margin:0; font-family:var(--type-family-base); font-size:var(--type-body);
    color:var(--color-ink-dim); line-height:var(--type-leading-relaxed);
    white-space:pre-wrap; }
  .wo-c__rows { display:flex; flex-direction:column; gap:var(--sero-space-3); }

  /* D — balanced split */
  .wo-d { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);
    gap:var(--sero-space-8); align-items:start; }
  .wo-frame--phone .wo-d { grid-template-columns:1fr; gap:var(--sero-space-5); }
  .wo-d__main { display:flex; flex-direction:column; gap:var(--sero-space-5); }
  .wo-d__side { display:flex; flex-direction:column; gap:var(--sero-space-5); }
  .wo-steps { list-style:none; margin:0; padding:0; display:flex; flex-direction:column;
    gap:var(--sero-space-4); }
  .wo-step { display:flex; gap:var(--sero-space-3); align-items:flex-start; }
  .wo-step__n { width:26px; height:26px; flex:none; border-radius:var(--sero-radius-pill);
    display:grid; place-items:center; background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-size:var(--type-body-sm);
    font-weight:var(--type-weight-semibold); }
  .wo-step__t { font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-normal); }
  .wo-step__t span { display:block; font-size:var(--type-body-sm); color:var(--color-ink-dim); }

  /* E — quiet start */
  .wo-e { max-width:600px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-6); padding-top:var(--sero-space-10); }
  .wo-frame--phone .wo-e { padding-top:var(--sero-space-5); }
  .wo-disclose { border-top:1px solid var(--color-border); padding-top:var(--sero-space-4);
    display:flex; flex-direction:column; gap:var(--sero-space-4); }

  /* Video, shared. Small by default: it is a footnote in four of the five. */
  .wo-video { position:relative; width:100%; aspect-ratio:16/9; overflow:hidden;
    border-radius:var(--radius-card); border:1px solid var(--color-border);
    background:var(--sero-primary-900); }
  .wo-video__poster { position:absolute; inset:0; width:100%; height:100%; display:grid;
    place-items:center; background:linear-gradient(135deg,
      var(--sero-primary-800), var(--sero-lavender-800)); border:none; cursor:pointer; }
  .wo-video__play { width:52px; height:52px; border-radius:var(--sero-radius-pill);
    background:var(--color-surface); display:grid; place-items:center;
    box-shadow:var(--shadow-lift); }
  .wo-video__play::after { content:""; width:0; height:0; margin-left:4px;
    border-top:9px solid transparent; border-bottom:9px solid transparent;
    border-left:15px solid var(--color-accent-dark); }
  .wo-video__frame { position:absolute; inset:0; width:100%; height:100%; border:0; }
  .wo-video__cap { font-size:var(--type-body-sm); color:var(--color-ink-dim); }
  .wo-videocard { display:flex; flex-direction:column; gap:var(--sero-space-2); }
`;

let option = "a";
let width = "desktop";

const OPTIONS = [
  { id: "a", label: "A · One column" },
  { id: "b", label: "B · Brief as hero" },
  { id: "c", label: "C · Notes to brief" },
  { id: "d", label: "D · Balanced split" },
  { id: "e", label: "E · Quiet start" },
];

const NOTES = {
  a: "<b>A. One column.</b> The second column is gone and everything sits in one 640px measure, so the page no longer ends a third of the way down. The video drops to a line of text under the button. This is the smallest change that fixes the two structural problems, and it changes nothing about what the screen says.",
  b: "<b>B. Brief as hero.</b> The sample stops looking like a settings form and starts looking like the document it is: Sofia's name in the display face, an avatar, larger body type, a lifted paper surface. A soft banner across the top carries the honesty (this is an example) so the card itself never has to apologise. The bet: the artefact sells itself if you actually let it be seen.",
  c: "<b>C. Notes to brief.</b> The only option that shows the INPUT. Rough typed notes on the left, the brief they produced on the right, an arrow between them. A stranger learns in one glance that they type three scruffy lines and get this back, which is the thing the shipped screen never says. The bet: the transform is the product, not the brief.",
  d: "<b>D. Balanced split.</b> Keeps two columns but reverses the weight: the brief takes the wide side, and the narrow side carries three short what-happens-next lines with the video as a small card at the bottom. The bet: the two-column instinct was right and the ratio was wrong, a 16:9 black box should never have had half the screen.",
  e: "<b>E. Quiet start.</b> Headline, one line, one button. The sample brief is one click away behind \"See a finished brief\", and the video behind a second. The bet: someone who signed up to prep a 1:1 wants to start, and showing them less gets them there faster. Highest risk of the five, because a stranger who does not click sees nothing.",
};

// ---- pieces -------------------------------------------------------------------------

const head = (h1 = "A brief for your next 1:1") => `
  <div class="l-stack l-stack--2">
    <div class="wo-eyebrow">Welcome to Sero</div>
    <h1 class="wo-h1">${h1}</h1>
    <p class="wo-lede">${POSITIONING_LINE}</p>
  </div>`;

const cta = (label = "Prep your first 1:1") => `
  <div class="wo-cta">
    <button type="button" class="btn btn--primary js-noop">${label}</button>
    <span class="wo-time">${TIME_LINE}</span>
  </div>`;

const briefRows = () => `
  <div class="wo-row">
    <span class="wo-row__label">How to open</span>
    <p class="wo-row__text">${SAMPLE_BRIEF.open}</p>
  </div>
  <div class="wo-row">
    <span class="wo-row__label">What to explore</span>
    <p class="wo-row__text">${SAMPLE_BRIEF.explore}</p>
  </div>
  <div class="wo-row">
    <span class="wo-row__label">What to listen for</span>
    <p class="wo-row__text">${SAMPLE_BRIEF.listenFor}</p>
  </div>`;

const briefCard = () => `
  <div class="wo-brief">
    <div class="wo-brief__head">
      <span class="wo-brief__who">${SAMPLE_BRIEF.name} · ${SAMPLE_BRIEF.meetingType}</span>
      <span class="wo-tag">Sample brief</span>
    </div>
    ${briefRows()}
    <button type="button" class="wo-link js-noop">See the whole example 1:1</button>
  </div>`;

const videoBlock = (caption = "See how Sero works") => `
  <div class="wo-videocard">
    <div class="wo-video js-video">
      <button type="button" class="wo-video__poster js-play" aria-label="Play the video: ${VIDEO.title}">
        <span class="wo-video__play" aria-hidden="true"></span>
      </button>
    </div>
    <span class="wo-video__cap">${caption}</span>
  </div>`;

const videoLink = () =>
  `<button type="button" class="wo-link js-video-link">Watch the two-minute walkthrough</button>`;

// ---- the five screens ---------------------------------------------------------------

const screenA = () => `
  <div class="wo-a">
    <div class="wo-a__head">${head()}</div>
    ${briefCard()}
    ${cta()}
    <div class="wo-a__foot">
      ${videoLink()}
      <div class="js-video-slot"></div>
    </div>
  </div>`;

const screenB = () => `
  <div class="wo-b">
    ${head("This is what Sero writes you")}
    <div class="wo-doc">
      <div class="wo-doc__banner">An example, so you can see one before you make one</div>
      <div class="wo-doc__head">
        <span class="wo-avatar" aria-hidden="true">S</span>
        <span>
          <span class="wo-doc__name">${SAMPLE_BRIEF.name}</span>
          <span class="wo-doc__meta">${SAMPLE_BRIEF.meetingType} · prep brief</span>
        </span>
      </div>
      <div class="wo-doc__body">
        <div class="wo-doc__row">
          <span class="wo-doc__label">How to open</span>
          <p class="wo-doc__text">${SAMPLE_BRIEF.open}</p>
        </div>
        <div class="wo-doc__row">
          <span class="wo-doc__label">What to explore</span>
          <p class="wo-doc__text">${SAMPLE_BRIEF.explore}</p>
        </div>
        <div class="wo-doc__row">
          <span class="wo-doc__label">What to listen for</span>
          <p class="wo-doc__text">${SAMPLE_BRIEF.listenFor}</p>
        </div>
      </div>
    </div>
    ${cta("Write mine")}
    ${videoLink()}
    <div class="js-video-slot"></div>
  </div>`;

const screenC = () => `
  <div class="wo-c">
    ${head("Rough notes in. A plan out.")}
    <div class="wo-flow">
      <div class="wo-panel wo-panel--in">
        <span class="wo-panel__cap">What you type, in two minutes</span>
        <p class="wo-notes">${SAMPLE_NOTES}</p>
      </div>
      <div class="wo-flow__arrow" aria-hidden="true">&rarr;</div>
      <div class="wo-panel">
        <div class="wo-brief__head">
          <span class="wo-panel__cap">What you walk in with</span>
          <span class="wo-tag">Sample</span>
        </div>
        <div class="wo-c__rows">${briefRows()}</div>
      </div>
    </div>
    ${cta()}
    ${videoLink()}
    <div class="js-video-slot"></div>
  </div>`;

const screenD = () => `
  <div class="wo-d">
    <div class="wo-d__main">
      ${head()}
      ${briefCard()}
      ${cta()}
    </div>
    <aside class="wo-d__side">
      <ul class="wo-steps">
        <li class="wo-step">
          <span class="wo-step__n">1</span>
          <span class="wo-step__t">Type rough notes<span>Whatever you already know. Fragments are fine.</span></span>
        </li>
        <li class="wo-step">
          <span class="wo-step__n">2</span>
          <span class="wo-step__t">Get a brief like this one<span>How to open, what to explore, what to listen for.</span></span>
        </li>
        <li class="wo-step">
          <span class="wo-step__n">3</span>
          <span class="wo-step__t">Run the 1:1<span>Sero keeps up as you go and writes the recap.</span></span>
        </li>
      </ul>
      ${videoBlock()}
    </aside>
  </div>`;

const screenE = () => `
  <div class="wo-e">
    ${head()}
    ${cta()}
    <div class="wo-disclose">
      <button type="button" class="wo-link js-disclose" aria-expanded="false">See a finished brief</button>
      <div class="js-sample" hidden>${briefCard()}</div>
      ${videoLink()}
      <div class="js-video-slot"></div>
    </div>
  </div>`;

const SCREENS = { a: screenA, b: screenB, c: screenC, d: screenD, e: screenE };

// ---- render + wiring ------------------------------------------------------------------

function render(host) {
  const seg = (name, items, current) =>
    items
      .map(
        (i) =>
          `<button type="button" class="wo-seg__btn" data-${name}="${i.id}" aria-pressed="${i.id === current}">${i.label}</button>`,
      )
      .join("");

  host.innerHTML = `
    <style>${STYLE}</style>
    <div class="wo-wrap">
      <div class="wo-bar">
        <div class="wo-seg-wrap">
          <span class="wo-seg-label">Option</span>
          <div class="wo-seg">${seg("opt", OPTIONS, option)}</div>
        </div>
        <div class="wo-seg-wrap">
          <span class="wo-seg-label">Width</span>
          <div class="wo-seg">${seg(
            "width",
            [
              { id: "desktop", label: "Desktop" },
              { id: "phone", label: "Phone" },
            ],
            width,
          )}</div>
        </div>
      </div>
      <p class="wo-note">${NOTES[option]}</p>
      <div class="wo-frame ${width === "phone" ? "wo-frame--phone" : ""}">
        <div class="wo-screen">${SCREENS[option]()}</div>
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

  // The video is click-to-load in every option, exactly as the shipped screen does it:
  // nothing reaches Google until it is asked for.
  host.querySelectorAll(".js-play").forEach((btn) =>
    btn.addEventListener("click", () => {
      btn.closest(".js-video").innerHTML = videoIframeHtml().replace(
        "start-video__frame",
        "wo-video__frame",
      );
    }),
  );
  host.querySelectorAll(".js-video-link").forEach((link) =>
    link.addEventListener("click", () => {
      const slot = link.parentElement.querySelector(".js-video-slot");
      if (!slot) return;
      slot.innerHTML = slot.innerHTML ? "" : videoBlock("Carl's walkthrough");
      slot.querySelector(".js-play")?.addEventListener("click", (e) => {
        e.currentTarget.closest(".js-video").innerHTML = videoIframeHtml().replace(
          "start-video__frame",
          "wo-video__frame",
        );
      });
    }),
  );

  const disclose = host.querySelector(".js-disclose");
  disclose?.addEventListener("click", () => {
    const sample = host.querySelector(".js-sample");
    const open = sample.hidden;
    sample.hidden = !open;
    disclose.setAttribute("aria-expanded", String(open));
    disclose.textContent = open ? "Hide the example" : "See a finished brief";
  });

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
