// Test: "How it works. Three shapes" — Carl, 2026-07-29: testers are unclear on how Sero
// actually works, and the committee advised ONE standing click-through of the full arc,
// prototyped in the gallery before anything ships. Mock only: hardcoded copy, zero API
// calls, nothing saved, no routing.
//
// Carl's calls that shaped this (committee, two sittings, 2026-07-29):
//   · The story is the FULL arc, six steps, through the meeting and the loop. Today every
//     surface a manager can reach stops the story at the brief.
//   · It is about the steps, not the details: each step is a line or two of what happens
//     and what you do. No deep engine content in the panels.
//   · Step names must not invent a fourth vocabulary: each step carries the real stage
//     label a manager sees on screen (imported from stage-labels.js so it cannot drift).
//   · Step 4, Sero in the meeting with you, is the differentiator (Dunford seat): it gets
//     visual weight in every shape.
//   · Before / In the room / After chaptering in every shape (Rogelberg seat).
//   · Pass bar for the gallery talk (Seibel seat): someone new reads a shape for 30
//     seconds and can say back what Sero does. If none manages that, none ships.
//
// The three shapes, deliberately different, not three paint jobs:
//   A · Stepper     — the journey as one row of six; click along it, one step open at a
//                     time. Carries the "five kinds of 1:1" strip so we can judge whether
//                     it belongs on this page at all.
//   B · Chapters    — Before / In the room / After as three headings; the story in three
//                     reads, click a step for its detail.
//   C · One page    — all six steps visible, nothing behind a click. A page you could
//                     send someone.
//
// House rules: UK English, plain words, no em dashes, 14px floor.

import { STAGE_DISPLAY } from "../../ui/stage-labels.js";

// The six steps. `chip` is the label the real screen shows for that part of the flow,
// straight from STAGE_DISPLAY; step 6 has no screen of its own (it is the loop), so its
// chip names the moment instead.
const STEPS = [
  {
    n: 1,
    chapter: "Before",
    title: "Say what's on your mind",
    line: "Type rough notes about the person you are meeting. Half sentences are fine.",
    you: "About two minutes of typing.",
    chip: STAGE_DISPLAY.INTAKE,
  },
  {
    n: 2,
    chapter: "Before",
    title: "Sero asks you back",
    line: "Two or three short questions to find what the conversation is really about.",
    you: "You answer in a line or two.",
    chip: STAGE_DISPLAY.FOCUS_POINTS,
  },
  {
    n: 3,
    chapter: "Before",
    title: "Walk in with a brief",
    line: "Three focus points: how to open, what to explore, what to listen for.",
    you: "Small enough to hold in your head on the way to the room.",
    chip: STAGE_DISPLAY.PREPARATION,
  },
  {
    n: 4,
    chapter: "In the room",
    title: "Sero sits in the meeting with you",
    line: "One question at a time, in an order that follows the conversation.",
    you: "You ask, listen, and jot a quick note.",
    chip: STAGE_DISPLAY.QUESTIONING,
    big: true,
  },
  {
    n: 5,
    chapter: "After",
    title: "Walk out with a recap",
    line: "What was said, what it means, and the actions you both agreed.",
    you: "Only actions you confirm are kept.",
    chip: STAGE_DISPLAY.BRIEFING,
  },
  {
    n: 6,
    chapter: "After",
    title: "The next one picks up here",
    line: "Last time's promises are checked in, and fresh ground gets covered.",
    you: "You just start the next one. Sero remembers.",
    chip: "Next 1:1",
  },
];

const CHAPTERS = ["Before", "In the room", "After"];

// Copied from backend/engine/meeting-types.ts (labels + durations only). Hardcoded on
// purpose: the gallery is mock-only and never imports backend code. If this strip ships,
// the real page reads the catalog like everything else does.
const MEETING_TYPES = [
  ["Bi-weekly check-in", "15 to 20 min"],
  ["Performance & feedback", "20 to 30 min"],
  ["Growth & career plan", "35 to 50 min"],
  ["Something feels off", "20 to 30 min"],
  ["Onboarding check-in", "15 to 20 min"],
];

const STYLE = `
  .hw-wrap { display:flex; flex-direction:column; gap:var(--sero-space-5); }

  /* Prototype chrome (same harness as the welcome tests) */
  .hw-bar { display:flex; flex-wrap:wrap; gap:var(--sero-space-5); align-items:flex-end; }
  .hw-seg-wrap { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .hw-seg-label { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); }
  .hw-seg { display:inline-flex; flex-wrap:wrap; gap:var(--sero-space-0-5);
    padding:var(--sero-space-0-5); background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-sm); }
  .hw-seg__btn { font:inherit; font-size:var(--type-body-sm);
    font-weight:var(--type-weight-medium); color:var(--color-ink-dim);
    background:transparent; border:none; border-radius:var(--sero-radius-sm);
    padding:var(--sero-space-1) var(--sero-space-3); cursor:pointer; white-space:nowrap; }
  .hw-seg__btn:hover { color:var(--color-ink); }
  .hw-seg__btn[aria-pressed="true"] { background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-weight:var(--type-weight-semibold); }
  .hw-seg__btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .hw-note { margin:0; max-width:var(--measure-lede); font-size:var(--type-body-sm);
    color:var(--color-ink-dim); line-height:var(--type-leading-normal); }
  .hw-note b { color:var(--color-ink); font-weight:var(--type-weight-semibold); }

  .hw-frame { position:relative; border:1px solid var(--color-border);
    border-radius:var(--radius-frame); overflow:hidden; background:var(--color-bg);
    box-shadow:var(--shadow-lift); }
  .hw-frame--phone { max-width:390px; margin-inline:auto; }
  .hw-screen { min-height:700px; padding:clamp(var(--sero-space-5), 4vw, var(--sero-space-10));
    box-sizing:border-box; }
  .hw-frame--phone .hw-screen { min-height:760px; padding:var(--sero-space-5); }
  .hw-fold { position:absolute; left:0; right:0; top:640px; border-top:1px dashed
    var(--color-border); pointer-events:none; }
  .hw-frame--phone .hw-fold { top:700px; }
  .hw-fold span { position:absolute; right:var(--sero-space-3); top:4px;
    font-size:var(--type-body-sm); color:var(--color-ink-mute); }

  /* Shared pieces */
  .hw-head { display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .hw-eyebrow { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wider); text-transform:uppercase;
    color:var(--color-accent-dark); }
  .hw-h1 { margin:0; font-family:var(--type-family-display); font-size:var(--type-h1);
    font-weight:var(--type-weight-semibold); line-height:var(--type-leading-tight);
    letter-spacing:var(--type-tracking-tight); color:var(--color-ink); max-width:18ch; }
  .hw-lede { margin:0; font-size:var(--type-body-lg); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); max-width:46ch; }
  .hw-cta-row { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-4); }
  .hw-btn { font:inherit; font-size:var(--type-body-lg);
    font-weight:var(--type-weight-semibold); color:var(--color-surface);
    background:var(--color-accent); border:none; border-radius:var(--sero-radius-sm);
    padding:var(--sero-space-3) var(--sero-space-6); cursor:pointer; }
  .hw-btn:hover { background:var(--color-accent-dark); }
  .hw-btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .hw-frame--phone .hw-btn { width:100%; }
  .hw-time { font-size:var(--type-body-sm); color:var(--color-ink-mute); }
  .hw-chip { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-pill);
    padding:2px var(--sero-space-3); white-space:nowrap; }
  .hw-chip--label { color:var(--color-ink-mute); }
  .hw-you { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); }
  .hw-you b { color:var(--color-ink); font-weight:var(--type-weight-semibold); }

  /* A — the stepper */
  .hw-a { max-width:760px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-5); padding-top:var(--sero-space-6); }
  .hw-frame--phone .hw-a { padding-top:var(--sero-space-3); }
  .hw-rail { display:flex; flex-wrap:wrap; gap:var(--sero-space-2); }
  .hw-stop { font:inherit; display:flex; align-items:center; gap:var(--sero-space-2);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--sero-radius-pill); padding:var(--sero-space-1) var(--sero-space-3);
    cursor:pointer; color:var(--color-ink-dim); font-size:var(--type-body-sm);
    font-weight:var(--type-weight-medium); }
  .hw-stop:hover { color:var(--color-ink); }
  .hw-stop:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .hw-stop__n { width:20px; height:20px; flex:none; border-radius:var(--sero-radius-pill);
    display:grid; place-items:center; background:var(--color-bg);
    border:1px solid var(--color-border); color:var(--color-ink-dim);
    font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold); }
  .hw-stop[aria-pressed="true"] { background:var(--color-accent-soft);
    border-color:var(--color-accent); color:var(--color-accent-dark);
    font-weight:var(--type-weight-semibold); }
  .hw-stop[aria-pressed="true"] .hw-stop__n { background:var(--color-accent);
    border-color:var(--color-accent); color:var(--color-surface); }
  .hw-stop--big { border-color:var(--color-accent); }
  .hw-stop--big .hw-stop__n { border-color:var(--color-accent);
    color:var(--color-accent-dark); }
  .hw-panel { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); box-shadow:var(--shadow-lift);
    padding:var(--space-card-pad); display:flex; flex-direction:column;
    gap:var(--sero-space-3); }
  .hw-panel--big { background:var(--color-accent-soft);
    border-color:var(--color-accent); }
  .hw-panel__meta { display:flex; flex-wrap:wrap; align-items:center;
    gap:var(--sero-space-2); }
  .hw-panel__title { margin:0; font-family:var(--type-family-display);
    font-size:var(--type-h3); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); line-height:var(--type-leading-tight); }
  .hw-panel__line { margin:0; font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-relaxed); max-width:52ch; }
  .hw-types { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-2);
    border-top:1px solid var(--color-border); padding-top:var(--sero-space-4); }
  .hw-types__cap { font-size:var(--type-body-sm); color:var(--color-ink-dim);
    font-weight:var(--type-weight-semibold); margin-right:var(--sero-space-1); }

  /* B — three chapters */
  .hw-b { max-width:680px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-6); padding-top:var(--sero-space-6); }
  .hw-frame--phone .hw-b { padding-top:var(--sero-space-3); }
  .hw-chapter { display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .hw-chapter__cap { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wider); text-transform:uppercase;
    color:var(--color-ink-mute); }
  .hw-row { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); overflow:hidden; }
  .hw-row--big { background:var(--color-accent-soft); border-color:var(--color-accent); }
  .hw-row__head { font:inherit; width:100%; display:flex; align-items:center;
    gap:var(--sero-space-3); background:transparent; border:none; cursor:pointer;
    padding:var(--sero-space-3) var(--space-card-pad); text-align:left; }
  .hw-row__head:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .hw-row__n { width:24px; height:24px; flex:none; border-radius:var(--sero-radius-pill);
    display:grid; place-items:center; background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-size:var(--type-body-sm);
    font-weight:var(--type-weight-semibold); }
  .hw-row--big .hw-row__n { background:var(--color-accent); color:var(--color-surface); }
  .hw-row__title { flex:1; font-size:var(--type-body); color:var(--color-ink);
    font-weight:var(--type-weight-semibold); line-height:var(--type-leading-normal); }
  .hw-row__caret { color:var(--color-ink-mute); font-size:var(--type-body-sm);
    transition:transform 120ms ease; }
  .hw-row[data-open="true"] .hw-row__caret { transform:rotate(90deg); }
  .hw-row__body { display:none; padding:0 var(--space-card-pad) var(--sero-space-4);
    flex-direction:column; gap:var(--sero-space-2); }
  .hw-row[data-open="true"] .hw-row__body { display:flex; }
  .hw-row__line { margin:0; font-size:var(--type-body); color:var(--color-ink);
    line-height:var(--type-leading-relaxed); max-width:52ch; }

  /* C — one page, six rows */
  .hw-c { max-width:680px; margin-inline:auto; display:flex; flex-direction:column;
    gap:var(--sero-space-5); padding-top:var(--sero-space-6); }
  .hw-frame--phone .hw-c { padding-top:var(--sero-space-3); }
  .hw-list { display:flex; flex-direction:column; gap:var(--sero-space-3); }
  .hw-flat { display:grid; grid-template-columns:auto 1fr; gap:var(--sero-space-3);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4) var(--space-card-pad); }
  .hw-flat--big { background:var(--color-accent-soft); border-color:var(--color-accent); }
  .hw-flat__b { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .hw-flat__meta { display:flex; flex-wrap:wrap; align-items:baseline;
    gap:var(--sero-space-2); }
  .hw-flat__title { margin:0; font-size:var(--type-body-lg);
    font-weight:var(--type-weight-semibold); color:var(--color-ink);
    line-height:var(--type-leading-tight); }
  .hw-flat__line { margin:0; font-size:var(--type-body); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); max-width:52ch; }
  .hw-cap-row { display:flex; align-items:center; gap:var(--sero-space-3);
    margin-top:var(--sero-space-2); }
  .hw-cap-row:first-child { margin-top:0; }
  .hw-cap-row::after { content:""; flex:1; border-top:1px solid var(--color-border); }
  .hw-cap-row span { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-wider); text-transform:uppercase;
    color:var(--color-ink-mute); }
`;

let option = "a";
let width = "desktop";
let stepA = 1; // which step is open in the stepper
let openB = new Set([4]); // which steps are expanded in chapters; step 4 starts open

const OPTIONS = [
  { id: "a", label: "A · Stepper" },
  { id: "b", label: "B · Three chapters" },
  { id: "c", label: "C · One page" },
];

const NOTES = {
  a: "<b>A · Stepper.</b> The whole journey as one row of six; click along it, one step open at a time. Bet: six small stops seen at a glance says \"this is light\" better than any sentence. The five kinds of 1:1 strip rides along at the foot so we can judge whether it belongs on this page at all.",
  b: "<b>B · Three chapters.</b> Before, in the room, after. The story lands in three reads; click a step for its detail. Step 4 starts open because it is the part nobody else can say. Bet: managers already hold a meeting in their head as before, during and after, so the shape does the teaching.",
  c: "<b>C · One page.</b> All six steps visible, nothing behind a click. Bet: thirty seconds of scanning beats any interaction, and a flat page is the version you could send to someone who has never seen Sero.",
};

// ---- shared bits ----------------------------------------------------------------------

const head = () => `
  <div class="hw-head">
    <div class="hw-eyebrow">What is Sero?</div>
    <h1 class="hw-h1">How Sero works</h1>
    <p class="hw-lede">From rough notes to a better 1:1, in six steps.</p>
  </div>`;

const cta = () => `
  <div class="hw-cta-row">
    <button type="button" class="hw-btn js-noop">Prep your first 1:1</button>
    <span class="hw-time">About two minutes of typing.</span>
  </div>`;

const chips = (s) => `
  <span class="hw-chip hw-chip--label">On screen: ${s.chip}</span>`;

// ---- the three shapes -----------------------------------------------------------------

const screenA = () => {
  const s = STEPS.find((x) => x.n === stepA);
  const stops = STEPS.map(
    (x) => `
      <button type="button" class="hw-stop ${x.big ? "hw-stop--big" : ""}"
        data-step="${x.n}" aria-pressed="${x.n === stepA}">
        <span class="hw-stop__n">${x.n}</span>${x.title}
      </button>`,
  ).join("");
  const types = MEETING_TYPES.map(([t, d]) => `<span class="hw-chip">${t} · ${d}</span>`).join("");
  return `
    <div class="hw-a">
      ${head()}
      ${cta()}
      <div class="hw-rail">${stops}</div>
      <div class="hw-panel ${s.big ? "hw-panel--big" : ""}">
        <div class="hw-panel__meta">
          <span class="hw-chip">${s.chapter}</span>
          ${chips(s)}
        </div>
        <h2 class="hw-panel__title">${s.title}</h2>
        <p class="hw-panel__line">${s.line}</p>
        <p class="hw-you"><b>You:</b> ${s.you}</p>
      </div>
      <div class="hw-types">
        <span class="hw-types__cap">Five kinds of 1:1</span>
        ${types}
      </div>
    </div>`;
};

const screenB = () => {
  const chapter = (cap) => {
    const rows = STEPS.filter((s) => s.chapter === cap)
      .map(
        (s) => `
        <div class="hw-row ${s.big ? "hw-row--big" : ""}" data-open="${openB.has(s.n)}">
          <button type="button" class="hw-row__head" data-step="${s.n}">
            <span class="hw-row__n">${s.n}</span>
            <span class="hw-row__title">${s.title}</span>
            <span class="hw-row__caret">›</span>
          </button>
          <div class="hw-row__body">
            <p class="hw-row__line">${s.line}</p>
            <p class="hw-you"><b>You:</b> ${s.you}</p>
            <div>${chips(s)}</div>
          </div>
        </div>`,
      )
      .join("");
    return `
      <div class="hw-chapter">
        <span class="hw-chapter__cap">${cap}</span>
        ${rows}
      </div>`;
  };
  return `
    <div class="hw-b">
      ${head()}
      ${cta()}
      ${CHAPTERS.map(chapter).join("")}
    </div>`;
};

const screenC = () => {
  const rows = CHAPTERS.map((cap) => {
    const items = STEPS.filter((s) => s.chapter === cap)
      .map(
        (s) => `
        <div class="hw-flat ${s.big ? "hw-flat--big" : ""}">
          <span class="hw-row__n">${s.n}</span>
          <div class="hw-flat__b">
            <div class="hw-flat__meta">
              <h2 class="hw-flat__title">${s.title}</h2>
              ${chips(s)}
            </div>
            <p class="hw-flat__line">${s.line}</p>
            <p class="hw-you"><b>You:</b> ${s.you}</p>
          </div>
        </div>`,
      )
      .join("");
    return `<div class="hw-cap-row"><span>${cap}</span></div>${items}`;
  }).join("");
  return `
    <div class="hw-c">
      ${head()}
      ${cta()}
      <div class="hw-list">${rows}</div>
    </div>`;
};

const SCREENS = { a: screenA, b: screenB, c: screenC };

// ---- render + wiring ------------------------------------------------------------------

function render(host) {
  const seg = (name, items, current) =>
    items
      .map(
        (i) =>
          `<button type="button" class="hw-seg__btn" data-${name}="${i.id}" aria-pressed="${i.id === current}">${i.label}</button>`,
      )
      .join("");

  host.innerHTML = `
    <style>${STYLE}</style>
    <div class="hw-wrap">
      <div class="hw-bar">
        <div class="hw-seg-wrap">
          <span class="hw-seg-label">Shape</span>
          <div class="hw-seg">${seg("opt", OPTIONS, option)}</div>
        </div>
        <div class="hw-seg-wrap">
          <span class="hw-seg-label">Width</span>
          <div class="hw-seg">${seg(
            "width",
            [
              { id: "desktop", label: "Desktop" },
              { id: "phone", label: "Phone" },
            ],
            width,
          )}</div>
        </div>
      </div>
      <p class="hw-note">${NOTES[option]}</p>
      <div class="hw-frame ${width === "phone" ? "hw-frame--phone" : ""}">
        <div class="hw-screen">${SCREENS[option]()}</div>
        <div class="hw-fold"><span>laptop screen ends here</span></div>
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
  host.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      const n = Number(b.dataset.step);
      if (option === "a") stepA = n;
      if (option === "b") (openB.has(n) ? openB.delete(n) : openB.add(n));
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
  stepA = 1;
  openB = new Set([4]);
  render(root);
}
