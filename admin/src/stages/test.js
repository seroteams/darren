// Test area — /test (internal only, gated like /guide and /design; not in any nav).
// A gallery of throwaway UI prototypes: a card per test, click one to walk it, come back
// any time. No backend anywhere in here — every test is hardcoded mock data, nothing saved.
// New tests: add a module under ./tests/ exporting mount(root), then one entry to TESTS.

import "../styles/test-gallery.css";
import { mount as promisesLoop } from "./tests/promises-loop.js";
import { mount as promisesBeforeRecap } from "./tests/promises-before-recap.js";
import { mount as runnerV2 } from "./tests/runner-v2.js";
import { breadcrumb } from "../ui/breadcrumb.ts";

// Simple schematic thumbnails — a mini-mockup of each screen so a card is
// recognisable at a glance. Pure SVG (no captured PNGs to go stale); colours
// come from the design tokens via the .tg-thumb CSS classes below.
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

const THUMB_PICKER = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <g>
      <rect class="card" x="16" y="14" width="52" height="40" rx="6"/>
      <rect class="accent" x="24" y="22" width="36" height="6" rx="3"/>
      <rect class="ink" x="24" y="33" width="24" height="4" rx="2" opacity="0.35"/>
      <rect class="ink" x="24" y="41" width="30" height="4" rx="2" opacity="0.35"/>
    </g>
    <g>
      <rect class="card" x="76" y="14" width="52" height="40" rx="6" stroke="var(--color-accent)" stroke-width="2"/>
      <rect class="accent" x="84" y="20" width="36" height="12" rx="3"/>
      <rect class="ink" x="84" y="37" width="30" height="4" rx="2" opacity="0.35"/>
      <rect class="ink" x="84" y="45" width="24" height="4" rx="2" opacity="0.35"/>
    </g>
    <rect class="card" x="136" y="14" width="52" height="40" rx="6"/>
    <rect class="card" x="196" y="14" width="52" height="40" rx="6"/>
    <rect class="accent" x="256" y="14" width="28" height="40" rx="6" opacity="0.4"/>
    <rect class="card" x="16" y="66" width="268" height="42" rx="8"/>
    <rect class="accent" x="30" y="76" width="60" height="8" rx="4"/>
    <rect class="ink" x="30" y="90" width="180" height="6" rx="3" opacity="0.3"/>
    <rect class="ink" x="30" y="100" width="140" height="6" rx="3" opacity="0.3"/>
  </svg>`;

const THUMB_SPLIT = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="card" x="16" y="14" width="128" height="92" rx="8"/>
    <rect class="ink" x="28" y="26" width="90" height="8" rx="4" opacity="0.55"/>
    <rect class="ink" x="28" y="40" width="70" height="6" rx="3" opacity="0.3"/>
    <rect class="card" x="28" y="54" width="104" height="26" rx="4"/>
    <rect class="accent" x="28" y="88" width="40" height="10" rx="4"/>
    <rect x="150" y="0" width="150" height="120" fill="var(--sero-lavender-300)"/>
    <rect x="166" y="22" width="46" height="8" rx="4" fill="var(--sero-lavender-800)" opacity="0.7"/>
    <rect x="166" y="38" width="110" height="6" rx="3" fill="var(--sero-lavender-900)" opacity="0.55"/>
    <rect x="166" y="52" width="46" height="8" rx="4" fill="var(--sero-lavender-800)" opacity="0.7"/>
    <rect x="166" y="68" width="96" height="6" rx="3" fill="var(--sero-lavender-900)" opacity="0.55"/>
    <rect x="166" y="82" width="46" height="8" rx="4" fill="var(--sero-lavender-800)" opacity="0.7"/>
    <rect x="166" y="98" width="104" height="6" rx="3" fill="var(--sero-lavender-900)" opacity="0.55"/>
  </svg>`;

const TESTS = [
  {
    id: "runner-v2",
    title: "Runner v2. Split coach panel",
    blurb:
      "The questioning screen as a 50/50: the familiar question card on the left, and a light coach panel on the right with up to three hints per question. How to ask it, and what to listen for.",
    date: "18 Jul 2026",
    tag: "runner",
    thumb: THUMB_SPLIT,
    mount: runnerV2,
    bare: true,
    wide: true,
  },
  {
    id: "promises-before-recap",
    title: "Promises before the recap",
    blurb:
      "The promises step as its own moment after the last question: two lists. You promise / they promise. Edit, move, lock in. Then the recap's payoff band shows what was actually agreed (and what the skip path looks like).",
    date: "19 Jul 2026",
    tag: "runner",
    thumb: THUMB_RUNNER,
    mount: promisesBeforeRecap,
  },
  {
    id: "promises-loop",
    title: "Promises loop in the runner",
    blurb:
      "The loop that makes 1:1 №2 feel connected to №1: last question → agree next actions (primary CTA) → two weeks later they return as card zero, yours first, one tap each. And question 1 picks up whatever slipped. (Wrap-step design since superseded by 'Promises before the recap'. Kept for the loop story.)",
    date: "11 Jul 2026",
    tag: "runner",
    thumb: THUMB_RUNNER,
    mount: promisesLoop,
  },
  {
    // Artifact-link card (opens a claude.ai preview in a new tab — no mock code in the repo).
    id: "layout-picker",
    title: "Layout picker. Trigger + popover",
    blurb:
      "A quiet chip shows the current prep-brief layout; click it to open a popover of mini-preview tiles, pick one and the brief hops. All 11 real layouts. (Now shipped. Kept here as the design preview.)",
    date: "16 Jul 2026",
    tag: "prepare",
    thumb: THUMB_PICKER,
    url: "https://claude.ai/code/artifact/6de0a267-7591-4dce-9eb8-29e9f5b44842",
  },
];

// Scoped styling (.tg-*) lives in styles/test-gallery.css (imported above).

export async function mount(root) {
  const openGallery = () => {
    root.innerHTML = `
      <div class="l-container l-stack l-stack--8">
        <span class="tg-note">Test area · prototypes only. Mock data, nothing is saved</span>
        <header class="page-header">
          <h1 class="h1">Tests</h1>
          <p class="text-ink-dim">Ideas we want to see and feel before building them properly. Walk a mock in place, or open an artifact preview (↗) in a new tab.</p>
        </header>
        <div class="tg-grid">
          ${TESTS.map((t) =>
            t.url
              ? `
            <a class="tg-card" href="${t.url}" target="_blank" rel="noopener">
              ${t.thumb}
              <span class="tg-card__title">${t.title} <span class="tg-card__ext" aria-hidden="true">↗</span></span>
              <span class="tg-card__blurb">${t.blurb}</span>
              <span class="tg-card__meta"><span class="tg-tag">${t.tag}</span><span>${t.date}</span><span class="tg-card__link">Open preview ↗</span></span>
            </a>`
              : `
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
    const shell = test.wide ? "l-container l-container--full l-stack l-stack--4" : "l-container l-stack l-stack--4";
    // bare tests (full-runner mockups) drop the "Test · … nothing is saved" note and keep
    // only the trail, so the mockup's own chrome is all you see.
    const trail = breadcrumb([{ label: "Tests", nav: "tests" }, { label: test.title }]);
    const topRow = test.bare
      ? `<div class="page-header__row">${trail}</div>`
      : `<div class="page-header__row">
          ${trail}
          <span class="tg-note">Test · ${test.title}. Mock, nothing is saved</span>
        </div>`;
    root.innerHTML = `
      <div class="${shell}">
        ${topRow}
        <div class="js-test-host"></div>
      </div>`;
    root.querySelector('.js-crumb[data-nav="tests"]').addEventListener("click", openGallery);
    test.mount(root.querySelector(".js-test-host"));
  };

  openGallery();
}
