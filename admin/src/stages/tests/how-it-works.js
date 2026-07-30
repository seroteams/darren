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

// The old type tokens these prototypes still read (type-system P5).
import "./parked-tokens.css";

import { STAGE_DISPLAY } from "../../ui/stage-labels.js";

// Ghost-style schematic of each step's screen (Carl, 2026-07-29: "so text heavy" - every
// step gets a picture). Shapes only, never fake copy, drawn in the design tokens so they
// recolour with the theme. viewBox 220x140 across the set so the rows line up.
const ART = {
  notes: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect class="c" x="14" y="12" width="192" height="116" rx="10"/>
      <rect class="ln" x="30" y="30" width="70" height="7" rx="3.5" opacity="0.55"/>
      <rect class="ln" x="30" y="52" width="150" height="6" rx="3" opacity="0.28"/>
      <rect class="ln" x="30" y="68" width="128" height="6" rx="3" opacity="0.28"/>
      <rect class="ln" x="30" y="84" width="140" height="6" rx="3" opacity="0.28"/>
      <rect class="ln" x="30" y="100" width="92" height="6" rx="3" opacity="0.28"/>
      <rect class="ac" x="128" y="98" width="3" height="11"/>
    </svg>`,
  asks: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect class="c" x="14" y="14" width="140" height="32" rx="16"/>
      <rect class="ln" x="30" y="27" width="106" height="6" rx="3" opacity="0.4"/>
      <rect class="acs" x="66" y="56" width="140" height="28" rx="14"/>
      <rect class="ln" x="82" y="67" width="96" height="6" rx="3" opacity="0.45"/>
      <rect class="c" x="14" y="94" width="120" height="30" rx="15"/>
      <rect class="ln" x="30" y="106" width="86" height="6" rx="3" opacity="0.4"/>
    </svg>`,
  brief: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect class="c" x="26" y="10" width="168" height="120" rx="10"/>
      <rect class="ln" x="42" y="24" width="64" height="6" rx="3" opacity="0.5"/>
      <circle class="ac" cx="50" cy="52" r="7"/>
      <rect class="ln" x="64" y="44" width="40" height="5" rx="2.5" opacity="0.55"/>
      <rect class="ln" x="64" y="54" width="112" height="5" rx="2.5" opacity="0.28"/>
      <circle class="ac" cx="50" cy="80" r="7"/>
      <rect class="ln" x="64" y="72" width="46" height="5" rx="2.5" opacity="0.55"/>
      <rect class="ln" x="64" y="82" width="104" height="5" rx="2.5" opacity="0.28"/>
      <circle class="ac" cx="50" cy="108" r="7"/>
      <rect class="ln" x="64" y="100" width="52" height="5" rx="2.5" opacity="0.55"/>
      <rect class="ln" x="64" y="110" width="96" height="5" rx="2.5" opacity="0.28"/>
    </svg>`,
  meeting: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect class="c" x="10" y="12" width="122" height="116" rx="10"/>
      <rect class="ln" x="24" y="28" width="94" height="7" rx="3.5" opacity="0.6"/>
      <rect class="ln" x="24" y="46" width="80" height="5" rx="2.5" opacity="0.28"/>
      <rect class="ln" x="24" y="58" width="88" height="5" rx="2.5" opacity="0.28"/>
      <rect class="ln" x="24" y="70" width="64" height="5" rx="2.5" opacity="0.28"/>
      <rect class="acs" x="24" y="98" width="56" height="16" rx="8"/>
      <rect class="lv" x="142" y="12" width="68" height="116" rx="10"/>
      <rect class="lvd" x="152" y="26" width="30" height="5" rx="2.5" opacity="0.7"/>
      <rect class="lvd" x="152" y="36" width="48" height="6" rx="3" opacity="0.4"/>
      <rect class="lvd" x="152" y="54" width="34" height="5" rx="2.5" opacity="0.7"/>
      <rect class="lvd" x="152" y="64" width="40" height="6" rx="3" opacity="0.4"/>
      <rect class="lvd" x="152" y="82" width="26" height="5" rx="2.5" opacity="0.7"/>
      <rect class="lvd" x="152" y="92" width="46" height="6" rx="3" opacity="0.4"/>
      <rect class="lvd" x="152" y="110" width="38" height="6" rx="3" opacity="0.4"/>
    </svg>`,
  recap: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect class="c" x="26" y="10" width="168" height="120" rx="10"/>
      <rect class="ln" x="42" y="26" width="100" height="8" rx="4" opacity="0.6"/>
      <rect class="ln" x="42" y="44" width="136" height="5" rx="2.5" opacity="0.28"/>
      <rect class="ln" x="42" y="56" width="120" height="5" rx="2.5" opacity="0.28"/>
      <rect class="ac" x="42" y="74" width="12" height="12" rx="3"/>
      <rect class="ln" x="62" y="77" width="100" height="5" rx="2.5" opacity="0.4"/>
      <rect class="ac" x="42" y="96" width="12" height="12" rx="3" opacity="0.35"/>
      <rect class="ln" x="62" y="99" width="84" height="5" rx="2.5" opacity="0.4"/>
    </svg>`,
  loop: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect class="c" x="12" y="34" width="84" height="76" rx="10"/>
      <rect class="ac" x="26" y="48" width="10" height="10" rx="5"/>
      <rect class="ln" x="42" y="50" width="40" height="5" rx="2.5" opacity="0.4"/>
      <rect class="ln" x="26" y="68" width="56" height="5" rx="2.5" opacity="0.28"/>
      <rect class="ln" x="26" y="80" width="48" height="5" rx="2.5" opacity="0.28"/>
      <rect class="c" x="124" y="34" width="84" height="76" rx="10"/>
      <rect class="ln" x="138" y="50" width="52" height="5" rx="2.5" opacity="0.4"/>
      <rect class="ln" x="138" y="68" width="56" height="5" rx="2.5" opacity="0.28"/>
      <rect class="ln" x="138" y="80" width="40" height="5" rx="2.5" opacity="0.28"/>
      <path d="M100 72 H114" stroke="var(--color-accent)" stroke-width="2.5" fill="none"/>
      <path d="M112 66 L120 72 L112 78 Z" fill="var(--color-accent)"/>
      <path d="M166 32 C166 12, 54 12, 54 30" stroke="var(--color-accent)" stroke-width="2" fill="none" opacity="0.45" stroke-dasharray="4 4"/>
      <path d="M49 28 L59 28 L54 37 Z" fill="var(--color-accent)" opacity="0.45"/>
    </svg>`,
};

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
    art: ART.notes,
  },
  {
    n: 2,
    chapter: "Before",
    title: "Sero asks you back",
    line: "Two or three short questions to find what the conversation is really about.",
    you: "You answer in a line or two.",
    chip: STAGE_DISPLAY.FOCUS_POINTS,
    art: ART.asks,
  },
  {
    n: 3,
    chapter: "Before",
    title: "Walk in with a brief",
    line: "Three focus points: how to open, what to explore, what to listen for.",
    you: "Small enough to hold in your head on the way to the room.",
    chip: STAGE_DISPLAY.PREPARATION,
    art: ART.brief,
  },
  {
    n: 4,
    chapter: "In the room",
    title: "Sero sits in the meeting with you",
    line: "One question at a time, in an order that follows the conversation.",
    you: "You ask, listen, and jot a quick note.",
    chip: STAGE_DISPLAY.QUESTIONING,
    big: true,
    art: ART.meeting,
  },
  {
    n: 5,
    chapter: "After",
    title: "Walk out with a recap",
    line: "What was said, what it means, and the actions you both agreed.",
    you: "Only actions you confirm are kept.",
    chip: STAGE_DISPLAY.BRIEFING,
    art: ART.recap,
  },
  {
    n: 6,
    chapter: "After",
    title: "The next one picks up here",
    line: "Last time's promises are checked in, and fresh ground gets covered.",
    you: "You just start the next one. Sero remembers.",
    chip: "Next 1:1",
    art: ART.loop,
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

  /* Step art: ghost schematics drawn in tokens, one per step */
  .hw-art { flex:none; width:200px; align-self:center; }
  .hw-art svg { display:block; width:100%; height:auto; }
  .hw-art .c { fill:var(--color-surface); stroke:var(--color-border); stroke-width:1; }
  .hw-art .ln { fill:var(--color-ink); }
  .hw-art .ac { fill:var(--color-accent); }
  .hw-art .acs { fill:var(--color-accent-soft); }
  .hw-art .lv { fill:var(--sero-lavender-300); }
  .hw-art .lvd { fill:var(--sero-lavender-800); }

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
    padding:var(--space-card-pad); display:grid; grid-template-columns:1fr auto;
    gap:var(--sero-space-4); align-items:center; }
  .hw-frame--phone .hw-panel { grid-template-columns:1fr; }
  .hw-panel__text { display:flex; flex-direction:column; gap:var(--sero-space-3); }
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
  .hw-flat { display:grid; grid-template-columns:auto 1fr auto; gap:var(--sero-space-3);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4) var(--space-card-pad); }
  .hw-frame--phone .hw-flat { grid-template-columns:auto 1fr; }
  .hw-frame--phone .hw-flat .hw-art { grid-column:2; width:100%; max-width:240px;
    margin-top:var(--sero-space-2); }
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

// C is the default: Carl picked it on 29 Jul ("c but any chance we can add some images?").
let option = "c";
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
  c: "<b>C · One page.</b> Carl's pick, now with a picture per step: each row carries a small ghost schematic of the real screen at that moment. All six steps visible, nothing behind a click. Bet: thirty seconds of scanning beats any interaction, and a flat page is the version you could send to someone who has never seen Sero.",
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
        <div class="hw-panel__text">
          <div class="hw-panel__meta">
            <span class="hw-chip">${s.chapter}</span>
            ${chips(s)}
          </div>
          <h2 class="hw-panel__title">${s.title}</h2>
          <p class="hw-panel__line">${s.line}</p>
          <p class="hw-you"><b>You:</b> ${s.you}</p>
        </div>
        <span class="hw-art">${s.art}</span>
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
            <span class="hw-art">${s.art}</span>
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
          <span class="hw-art">${s.art}</span>
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
  option = "c";
  width = "desktop";
  stepA = 1;
  openB = new Set([4]);
  render(root);
}
