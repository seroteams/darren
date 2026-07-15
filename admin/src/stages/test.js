// Test area — /test (internal only, gated like /guide and /design; not in any nav).
// A gallery of throwaway UI prototypes: a card per test, click one to walk it, come back
// any time. No backend anywhere in here — every test is hardcoded mock data, nothing saved.
// New tests: add a module under ./tests/ exporting mount(root), then one entry to TESTS.

import { mount as promisesLoop } from "./tests/promises-loop.js";
import { mount as livePulse } from "./tests/live-pulse.js";
import { mount as setupRedesign } from "./tests/setup-redesign.js";

// Simple schematic thumbnails — a mini-mockup of each screen so a card is
// recognisable at a glance. Pure SVG (no captured PNGs to go stale); colours
// come from the design tokens via the .tg-thumb CSS classes below.
const THUMB_DASHBOARD = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="ink" x="16" y="14" width="86" height="8" rx="4" opacity="0.5"/>
    <rect class="accent" x="248" y="12" width="38" height="12" rx="6"/>
    <rect class="card" x="16" y="34" width="80" height="30" rx="6"/>
    <rect class="card" x="110" y="34" width="80" height="30" rx="6"/>
    <rect class="card" x="204" y="34" width="80" height="30" rx="6"/>
    <rect class="accent" x="24" y="42" width="34" height="7" rx="3.5"/>
    <rect class="accent" x="118" y="42" width="34" height="7" rx="3.5"/>
    <rect class="accent" x="212" y="42" width="34" height="7" rx="3.5"/>
    <rect class="ink" x="24" y="53" width="22" height="5" rx="2.5" opacity="0.35"/>
    <rect class="ink" x="118" y="53" width="22" height="5" rx="2.5" opacity="0.35"/>
    <rect class="ink" x="212" y="53" width="22" height="5" rx="2.5" opacity="0.35"/>
    <rect class="card" x="16" y="74" width="268" height="34" rx="6"/>
    <g class="accent" opacity="0.85">
      <rect x="28" y="92" width="12" height="12" rx="2"/>
      <rect x="52" y="86" width="12" height="18" rx="2"/>
      <rect x="76" y="96" width="12" height="8" rx="2"/>
      <rect x="100" y="88" width="12" height="16" rx="2"/>
      <rect x="124" y="82" width="12" height="22" rx="2"/>
      <rect x="148" y="90" width="12" height="14" rx="2"/>
      <rect x="172" y="84" width="12" height="20" rx="2"/>
    </g>
  </svg>`;
const THUMB_RUNNER = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="card" x="16" y="14" width="268" height="28" rx="6"/>
    <rect class="accent" x="26" y="21" width="14" height="14" rx="3"/>
    <path class="check" d="M29.5 28.5 l2.5 2.5 l5.5 -6"/>
    <rect class="ink" x="50" y="24" width="150" height="8" rx="4" opacity="0.3"/>
    <rect class="card" x="16" y="46" width="268" height="28" rx="6"/>
    <rect class="dot-todo" x="26" y="53" width="14" height="14" rx="3"/>
    <rect class="ink" x="50" y="56" width="180" height="8" rx="4" opacity="0.45"/>
    <rect class="card" x="16" y="78" width="268" height="28" rx="6"/>
    <rect class="dot-todo" x="26" y="85" width="14" height="14" rx="3"/>
    <rect class="ink" x="50" y="88" width="160" height="8" rx="4" opacity="0.45"/>
  </svg>`;

// Two-column setup screen: left = title + input + two person cards, right = the guide card.
const THUMB_SETUP = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="ink" x="16" y="14" width="70" height="7" rx="3.5" opacity="0.5"/>
    <rect class="accent" x="16" y="28" width="130" height="6" rx="3"/>
    <rect class="card" x="16" y="42" width="130" height="18" rx="4"/>
    <rect class="accent" x="112" y="46" width="30" height="10" rx="3"/>
    <rect class="card" x="16" y="66" width="130" height="20" rx="4"/>
    <rect class="card" x="16" y="90" width="130" height="20" rx="4"/>
    <rect class="card" x="164" y="14" width="120" height="96" rx="6"/>
    <rect class="accent" x="176" y="26" width="40" height="6" rx="3"/>
    <circle class="accent" cx="182" cy="48" r="6"/>
    <rect class="ink" x="196" y="45" width="76" height="6" rx="3" opacity="0.4"/>
    <circle class="accent" cx="182" cy="68" r="6"/>
    <rect class="ink" x="196" y="65" width="76" height="6" rx="3" opacity="0.4"/>
    <circle class="accent" cx="182" cy="88" r="6"/>
    <rect class="ink" x="196" y="85" width="76" height="6" rx="3" opacity="0.4"/>
  </svg>`;

const TESTS = [
  {
    id: "setup-redesign",
    title: "Setup screen redesign — \"Who are you prepping for?\"",
    blurb:
      "The reworked /new setup step: no run stage-rail up top, a 50/50 layout with the \"First time?\" guide moved to the right, and the \"add someone new\" input lifted above the existing people.",
    date: "15 Jul 2026",
    tag: "setup",
    thumb: THUMB_SETUP,
    wide: true, // the 50/50 layout needs more than the reading column
    mount: setupRedesign,
  },
  {
    id: "live-pulse",
    title: "Live pulse — the founder dashboard",
    blurb:
      "Your window into the live site: who registered, their runs and run TYPES, who came back unprompted (the Gate 1 number), where runs break off, guest runs, errors. Click a manager → their team and every run; click a run → the answers they typed and the feedback they left.",
    date: "12 Jul 2026",
    tag: "live admin",
    thumb: THUMB_DASHBOARD,
    wide: true, // a dashboard wants the full width, not the reading column
    mount: livePulse,
  },
  {
    id: "promises-loop",
    title: "Promises loop in the runner",
    blurb:
      "The loop that makes 1:1 №2 feel connected to №1: last question → agree next actions (primary CTA) → two weeks later they return as card zero, yours first, one tap each — and question 1 picks up whatever slipped.",
    date: "11 Jul 2026",
    tag: "runner",
    thumb: THUMB_RUNNER,
    mount: promisesLoop,
  },
];

const STYLE = `
  .tg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(17rem, 1fr));
    gap:var(--sero-space-4); }
  .tg-card { text-align:left; font:inherit; cursor:pointer; display:flex;
    flex-direction:column; gap:var(--sero-space-2); padding:var(--sero-space-5);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); box-shadow:var(--shadow-card);
    transition:transform .15s ease, border-color .15s ease; }
  .tg-card:hover { transform:translateY(-2px); border-color:var(--color-accent); }
  .tg-card:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .tg-thumb { width:100%; height:auto; display:block; border:1px solid var(--color-border);
    border-radius:var(--radius-button); overflow:hidden; }
  .tg-thumb .bg { fill:var(--sero-primary-100); }
  .tg-thumb .card { fill:var(--color-surface); stroke:var(--color-border); stroke-width:1; }
  .tg-thumb .ink { fill:var(--color-ink); }
  .tg-thumb .accent { fill:var(--color-accent); }
  .tg-thumb .line { stroke:var(--color-border); }
  .tg-thumb .dot-done { fill:var(--color-accent); }
  .tg-thumb .dot-todo { fill:var(--color-surface); stroke:var(--color-border); stroke-width:1.5; }
  .tg-thumb .check { fill:none; stroke:#fff; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .tg-card__title { font-family:var(--type-family-display); font-size:18px; font-weight:600;
    color:var(--color-ink); }
  .tg-card__blurb { font-size:14px; line-height:1.5; color:var(--color-ink-dim); }
  .tg-card__meta { display:flex; gap:var(--sero-space-2); align-items:center;
    font-size:14px; color:var(--color-ink-mute); margin-top:auto; }
  .tg-tag { display:inline-block; font-size:14px; border-radius:9999px; padding:0 10px;
    background:var(--sero-primary-200); color:var(--color-accent-dark); }
  .tg-note { display:inline-block; font-size:14px; color:var(--color-ink-mute);
    background:var(--sero-primary-100); border:1px dashed var(--color-border);
    border-radius:var(--radius-button); padding:4px 10px; }
`;

export async function mount(root) {
  const openGallery = () => {
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="stage-inner l-stack l-stack--8">
        <span class="tg-note">Test area · prototypes only — mock data, nothing is saved</span>
        <header class="page-header">
          <h1 class="h1">Tests</h1>
          <p class="text-ink-dim">Ideas we want to see and feel before building them properly. Click one to walk it.</p>
        </header>
        <div class="tg-grid">
          ${TESTS.map(
            (t) => `
            <button type="button" class="tg-card" data-test="${t.id}">
              ${t.thumb}
              <span class="tg-card__title">${t.title}</span>
              <span class="tg-card__blurb">${t.blurb}</span>
              <span class="tg-card__meta"><span class="tg-tag">${t.tag}</span><span>${t.date}</span></span>
            </button>`,
          ).join("")}
        </div>
      </div>`;
    root.querySelectorAll("[data-test]").forEach((card) =>
      card.addEventListener("click", () => openTest(card.dataset.test)));
  };

  const openTest = (id) => {
    const test = TESTS.find((t) => t.id === id);
    if (!test) return openGallery();
    // wide tests (dashboards) break out of the reading column into the full stage width
    const shell = test.wide ? "l-container l-container--full l-stack l-stack--4" : "stage-inner l-stack l-stack--4";
    // bare tests (full-runner mockups) drop the "Test · … nothing is saved" note and keep
    // only the back button, so the mockup's own chrome is all you see.
    const topRow = test.bare
      ? `<div class="page-header__row" style="justify-content:flex-end">
          <button type="button" class="btn btn--ghost js-all-tests">← All tests</button>
        </div>`
      : `<div class="page-header__row">
          <span class="tg-note">Test · ${test.title} — mock, nothing is saved</span>
          <button type="button" class="btn btn--ghost js-all-tests">← All tests</button>
        </div>`;
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="${shell}">
        ${topRow}
        <div class="js-test-host"></div>
      </div>`;
    root.querySelector(".js-all-tests").addEventListener("click", openGallery);
    test.mount(root.querySelector(".js-test-host"));
  };

  openGallery();
}
