// Test area — /test (internal only, and local-only: it's in the router's LIVE_HIDDEN,
// so the "Tests" rail row and the route are both off on the live site).
// A gallery of throwaway UI prototypes: a card per test, click one to walk it, come back
// any time. No backend anywhere in here — every test is hardcoded mock data, nothing saved.
// New tests: add a module under ./tests/ exporting mount(root), then one entry to TESTS.

import "../styles/test-gallery.css";
import { mount as promisesLoop } from "./tests/promises-loop.js";
import { mount as promisesBeforeRecap } from "./tests/promises-before-recap.js";
import { mount as runnerV2 } from "./tests/runner-v2.js";
import { mount as entryRedesign } from "./tests/entry-redesign.js";
import { mount as welcomeRedesign } from "./tests/welcome-redesign.js";
import { mount as welcomeOptions } from "./tests/welcome-options.js";
import { mount as welcomeLean } from "./tests/welcome-lean.js";
import { mount as howItWorks } from "./tests/how-it-works.js";
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

// The entry redesign: the split screen with the form now sitting on a white card
// (boxed fields, one blue action) beside the brand photo half.
const THUMB_ENTRY = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect x="180" y="0" width="120" height="120" fill="var(--sero-primary-300)"/>
    <rect x="196" y="26" width="52" height="8" rx="4" fill="var(--sero-primary-800)" opacity="0.55"/>
    <rect x="196" y="42" width="88" height="6" rx="3" fill="var(--sero-primary-900)" opacity="0.4"/>
    <rect class="card" x="20" y="12" width="140" height="96" rx="8"/>
    <rect class="ink" x="82" y="22" width="16" height="16" rx="4" opacity="0.75"/>
    <rect class="ink" x="56" y="44" width="68" height="8" rx="4" opacity="0.55"/>
    <rect class="card" x="32" y="60" width="116" height="14" rx="3" stroke="var(--color-border-strong)"/>
    <rect class="card" x="32" y="78" width="116" height="14" rx="3" stroke="var(--color-border-strong)"/>
    <rect class="accent" x="32" y="96" width="116" height="6" rx="3"/>
  </svg>`;

// The welcome redesign: a hero with one action above four step cards, and the sample
// brief underneath as proof instead of beside as decoration.
const THUMB_WELCOME = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="ink" x="16" y="12" width="34" height="5" rx="2" opacity="0.4"/>
    <rect class="ink" x="16" y="22" width="150" height="10" rx="5" opacity="0.7"/>
    <rect class="ink" x="16" y="38" width="112" height="5" rx="2" opacity="0.3"/>
    <rect class="accent" x="16" y="49" width="46" height="12" rx="3"/>
    <rect class="card" x="16" y="68" width="62" height="38" rx="6"/>
    <rect class="accent" x="24" y="74" width="10" height="10" rx="5"/>
    <rect class="ink" x="24" y="90" width="44" height="4" rx="2" opacity="0.45"/>
    <rect class="ink" x="24" y="98" width="34" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="86" y="68" width="62" height="38" rx="6"/>
    <rect class="accent" x="94" y="74" width="10" height="10" rx="5"/>
    <rect class="ink" x="94" y="90" width="44" height="4" rx="2" opacity="0.45"/>
    <rect class="ink" x="94" y="98" width="34" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="156" y="68" width="62" height="38" rx="6"/>
    <rect class="accent" x="164" y="74" width="10" height="10" rx="5"/>
    <rect class="ink" x="164" y="90" width="44" height="4" rx="2" opacity="0.45"/>
    <rect class="ink" x="164" y="98" width="34" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="226" y="68" width="58" height="38" rx="6"/>
    <rect class="accent" x="234" y="74" width="10" height="10" rx="5"/>
    <rect class="ink" x="234" y="90" width="40" height="4" rx="2" opacity="0.45"/>
    <rect class="ink" x="234" y="98" width="30" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="182" y="12" width="102" height="46" rx="6"/>
    <rect class="ink" x="192" y="20" width="44" height="6" rx="3" opacity="0.6"/>
    <rect class="ink" x="192" y="32" width="82" height="4" rx="2" opacity="0.3"/>
    <rect class="ink" x="192" y="40" width="72" height="4" rx="2" opacity="0.3"/>
    <rect class="ink" x="192" y="48" width="60" height="4" rx="2" opacity="0.3"/>
  </svg>`;

// The five layout bets: same content, five different shapes for it.
// Leaner welcome: one short screen, a lot of empty page under it. The point of the
// thumbnail is the whitespace, so it is drawn deliberately sparse.
const THUMB_WELCOME_LEAN = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="card" x="70" y="14" width="160" height="76" rx="6"/>
    <rect class="ink" x="84" y="26" width="30" height="4" rx="2" opacity="0.45"/>
    <rect class="ink" x="84" y="36" width="104" height="8" rx="4" opacity="0.7"/>
    <rect class="ink" x="84" y="50" width="86" height="4" rx="2" opacity="0.3"/>
    <rect class="accent" x="84" y="62" width="52" height="12" rx="3"/>
    <rect class="ink" x="144" y="66" width="26" height="4" rx="2" opacity="0.25"/>
    <rect class="ink" x="84" y="100" width="132" height="3" rx="1.5" opacity="0.15"/>
  </svg>`;

const THUMB_WELCOME_OPTIONS = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="card" x="12" y="14" width="60" height="92" rx="6"/>
    <rect class="ink" x="20" y="22" width="36" height="6" rx="3" opacity="0.6"/>
    <rect class="accent" x="20" y="34" width="24" height="8" rx="3"/>
    <rect class="ink" x="20" y="50" width="44" height="4" rx="2" opacity="0.3"/>
    <rect class="ink" x="20" y="58" width="38" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="80" y="14" width="60" height="92" rx="6"/>
    <rect class="ink" x="88" y="22" width="30" height="6" rx="3" opacity="0.6"/>
    <rect class="ink" x="88" y="36" width="44" height="4" rx="2" opacity="0.3"/>
    <rect class="ink" x="88" y="44" width="40" height="4" rx="2" opacity="0.3"/>
    <rect class="ink" x="88" y="52" width="44" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="148" y="14" width="60" height="92" rx="6"/>
    <rect class="ink" x="156" y="22" width="20" height="26" rx="3" opacity="0.25"/>
    <rect class="accent" x="180" y="30" width="20" height="8" rx="3"/>
    <rect class="ink" x="156" y="56" width="44" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="216" y="14" width="34" height="92" rx="6"/>
    <rect class="ink" x="222" y="22" width="22" height="6" rx="3" opacity="0.6"/>
    <rect class="ink" x="222" y="34" width="18" height="4" rx="2" opacity="0.3"/>
    <rect class="card" x="258" y="14" width="30" height="92" rx="6"/>
    <rect class="ink" x="264" y="22" width="18" height="6" rx="3" opacity="0.6"/>
    <rect class="accent" x="264" y="34" width="14" height="8" rx="3"/>
  </svg>`;

// How it works: a row of six numbered stops with one open panel below, the accent on
// stop four (Sero in the meeting with you).
const THUMB_HOWITWORKS = `
  <svg class="tg-thumb" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="300" height="120"/>
    <rect class="card" x="16" y="14" width="38" height="16" rx="8"/>
    <rect class="card" x="60" y="14" width="38" height="16" rx="8"/>
    <rect class="card" x="104" y="14" width="38" height="16" rx="8"/>
    <rect class="accent" x="148" y="14" width="38" height="16" rx="8"/>
    <rect class="card" x="192" y="14" width="38" height="16" rx="8"/>
    <rect class="card" x="236" y="14" width="38" height="16" rx="8"/>
    <rect class="card" x="16" y="40" width="268" height="66" rx="8"/>
    <rect class="accent" x="28" y="52" width="12" height="12" rx="6"/>
    <rect class="ink" x="48" y="54" width="110" height="8" rx="4" opacity="0.6"/>
    <rect class="ink" x="28" y="74" width="220" height="6" rx="3" opacity="0.3"/>
    <rect class="ink" x="28" y="86" width="180" height="6" rx="3" opacity="0.3"/>
  </svg>`;

const TESTS = [
  {
    id: "how-it-works",
    title: "How it works. Three shapes",
    blurb:
      "The six-step story of Sero, start to finish, as a click-through in three shapes: a stepper you click along, three chapters (before, in the room, after), and a flat one-pager with nothing hidden. Step four, Sero in the meeting with you, carries extra weight in all three. Every step names the real screen label so the walkthrough and the app speak one language. Switch shape and width at the top.",
    date: "29 Jul 2026",
    tag: "onboarding",
    thumb: THUMB_HOWITWORKS,
    mount: howItWorks,
    bare: true,
    wide: true,
  },
  {
    id: "welcome-lean",
    title: "The welcome screen. Leaner, five ways",
    blurb:
      "The shipped welcome is three screens tall and buries the action. Five much shorter bets: one screen and a button, the notes box on the welcome itself, the three focus points shown as real output, notes in and brief out in one card, and a version that leads on getting sharper every time. A dashed line marks where a laptop screen ends. Switch option and width at the top.",
    date: "27 Jul 2026",
    tag: "onboarding",
    thumb: THUMB_WELCOME_LEAN,
    mount: welcomeLean,
    bare: true,
    wide: true,
  },
  {
    id: "welcome-redesign",
    title: "The welcome screen. Five versions",
    blurb:
      "The first thing a brand-new manager sees, rebuilt five ways: stage ladder, problem and fix, zig-zag, brief first, and a click-through walkthrough. Each one names the manager's problem and teaches the four steps with a benefit on each. Carl picked A on 26 Jul, and A is now the live welcome. Switch version and width at the top.",
    date: "26 Jul 2026",
    tag: "onboarding",
    thumb: THUMB_WELCOME,
    mount: welcomeRedesign,
    bare: true,
    wide: true,
  },
  {
    id: "welcome-options",
    title: "The first screen. Five options",
    blurb:
      "The same screen approached as five layout bets rather than five paint jobs: one column, brief as hero, notes to brief, rebalanced split, quiet start. Built in parallel with the five above, from the same rejected screenshot. Kept for the layout thinking.",
    date: "26 Jul 2026",
    tag: "onboarding",
    thumb: THUMB_WELCOME_OPTIONS,
    mount: welcomeOptions,
    bare: true,
    wide: true,
  },
  {
    id: "entry-redesign",
    title: "The way in. Two versions",
    blurb:
      "Log in, Create account and the free no-account door, redesigned as one set. Version A keeps today's three screens and dresses them to match. Version B collapses them into one front door with two tabs and the free path always visible. Switch version, screen and width at the top.",
    date: "25 Jul 2026",
    tag: "entry",
    thumb: THUMB_ENTRY,
    mount: entryRedesign,
    bare: true,
    wide: true,
  },
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
