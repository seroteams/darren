// Test: "The welcome screen. Five versions" — a redesign of the first-visit Home a
// brand-new manager sees before they have run a single 1:1 (today: start-welcome.ts).
// Mock only: hardcoded state, zero API calls, nothing saved, no routing.
//
// What today's screen gets wrong (measured against DESIGN.md and the screenshot Carl
// sent, not taste):
//   1 · Balance. A 60/40 split where the right 40% carries one broken video poster, so
//       the page reads as a column of text beside a hole, with the bottom two thirds
//       empty. (The live poster returns YouTube "Error 153", a separate real bug.)
//   2 · It never says what Sero does. There is no how-it-works anywhere: a stranger
//       reads a sample brief and has to reverse engineer the product from it.
//   3 · It never names the manager's problem, so the brief has nothing to be the
//       answer to.
//   4 · The sample brief is three unlabelled prose paragraphs. It is the proof, but it
//       is doing the work of the explanation as well, and it cannot carry both.
//   5 · The one action sits below a long read, at the bottom left of a tall page.
//
// The brief the five versions are built against: A inform, B speak to what managers
// actually report about their 1:1s, C show how it works as stages where each stage
// carries a benefit, D put the examples underneath rather than beside.
//
// Committee (2026-07-26) changed all five before they were built:
//   Seibel   — the button is above the fold in every version, the teaching sits below it.
//   Dunford  — every stage leads with the benefit, mechanism is the small print.
//   Rogelberg— the pain lines are behaviour managers actually report, not invented despair.
//   Rasmus   — the right hand column is gone in all five, one accent, one action.
//
// Copy comes from the shipped modules where it exists (the sample brief and the notes
// example), so this prototype cannot drift from the real thing.

import { SAMPLE_BRIEF } from "../start-welcome.ts";
import { GOOD_NOTES_EXAMPLE } from "../intake-firstrun.ts";

// ---- Shared content ----------------------------------------------------------------

// The four stages, benefit first (Dunford). The mechanism is the line underneath.
const STAGES = [
  {
    n: "1",
    title: "Say what is on your mind",
    benefit: "Two minutes of typing, not a form.",
    body: "Their first name, their role, and rough notes. Half sentences are fine.",
  },
  {
    n: "2",
    title: "Sero asks you back",
    benefit: "It finds the real issue under the notes.",
    body: "A short back and forth about what you actually saw, so the plan is about this 1:1 and not 1:1s in general.",
  },
  {
    n: "3",
    title: "Walk in with a brief",
    benefit: "No blank first minute.",
    body: "How to open, what to explore, what to listen for, what to avoid, and what a good outcome looks like.",
  },
  {
    n: "4",
    title: "The next one picks up here",
    benefit: "Follow through without a spreadsheet.",
    body: "What you both agreed comes back at the top of the next 1:1, so nothing quietly evaporates.",
  },
];

// What managers report about their own 1:1s. Reported behaviour, not invented despair
// (Rogelberg seat). Each line is answered by the stage at the same index.
const PAINS = [
  "It is in ten minutes and I have not thought about it.",
  "Same three questions, same ‘yeah, all good’.",
  "I know something is off. I cannot name it.",
  "Whatever we agreed last time has evaporated.",
];

const HERO = {
  eyebrow: "Welcome to Sero",
  title: "Walk in knowing what to say",
  lede: "Type rough notes before your next 1:1. Sero asks a few questions back, then hands you a plan for the conversation.",
  cta: "Prep your first 1:1",
  time: "About two minutes of typing.",
  video: "Watch the walkthrough",
};

const BRIEF_ROWS = [
  { label: "How to open", text: SAMPLE_BRIEF.open },
  { label: "What to explore", text: SAMPLE_BRIEF.explore },
  { label: "What to listen for", text: SAMPLE_BRIEF.listenFor },
];

// ---- Prototype CSS (scoped .wr-) ----------------------------------------------------
// Tokens only, no hex. Cards 12px, controls 4px, 14px floor, one blue action per screen.
const STYLE = `
  .wr-wrap { display:flex; flex-direction:column; gap:var(--sero-space-5); }

  /* Prototype chrome */
  .wr-bar { display:flex; flex-wrap:wrap; gap:var(--sero-space-5); align-items:flex-end; }
  .wr-seg-wrap { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wr-seg-label { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); }
  .wr-seg { display:inline-flex; gap:var(--sero-space-0-5); padding:var(--sero-space-0-5);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--sero-radius-sm); }
  .wr-seg__btn { font:inherit; font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:transparent; border:none;
    border-radius:var(--sero-radius-sm); padding:var(--sero-space-1) var(--sero-space-3);
    cursor:pointer; white-space:nowrap; }
  .wr-seg__btn:hover { color:var(--color-ink); }
  .wr-seg__btn[aria-pressed="true"] { background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-weight:var(--type-weight-semibold); }
  .wr-seg__btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .wr-note { margin:0; max-width:var(--measure-lede); font-size:var(--type-body-sm);
    color:var(--color-ink-dim); line-height:var(--type-leading-normal); }

  /* The framed screen */
  .wr-frame { border:1px solid var(--color-border); border-radius:var(--radius-frame);
    overflow:hidden; background:var(--color-page); box-shadow:var(--shadow-lift); }
  .wr-frame--phone { max-width:390px; margin-inline:auto; }
  .wr-screen { padding:clamp(var(--sero-space-5), 3.5vw, var(--sero-space-10));
    display:flex; flex-direction:column; gap:var(--sero-space-10); }
  .wr-frame--phone .wr-screen { padding:var(--sero-space-5); gap:var(--sero-space-8); }

  /* Hero. One accent, action above the teaching (Seibel seat). */
  .wr-hero { display:flex; flex-direction:column; gap:var(--sero-space-3);
    max-width:var(--measure-lede); }
  .wr-hero--wide { max-width:none; }
  .wr-hero__eyebrow { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-caps); text-transform:uppercase;
    color:var(--color-accent-dark); }
  .wr-hero__title { margin:0; font-family:var(--type-family-display);
    font-size:var(--type-display); font-weight:var(--type-weight-semibold);
    line-height:var(--type-leading-tight); letter-spacing:var(--type-tracking-tight);
    color:var(--color-ink); text-wrap:balance; }
  /* 16px, not 18: the screen already spends its four type levels on 42 / 20 / 16 / 14
     (DESIGN.md T1), so the lede separates itself by ink and measure, not a fifth rung. */
  .wr-hero__lede { margin:0; font-size:var(--type-body); line-height:var(--type-leading-normal);
    color:var(--color-ink-dim); max-width:var(--measure); text-wrap:pretty; }
  .wr-cta { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-4);
    margin-top:var(--sero-space-2); }
  .wr-btn { font:inherit; font-size:var(--type-body); font-weight:var(--type-weight-semibold);
    color:var(--color-surface); background:var(--color-accent); border:1px solid var(--color-accent);
    border-radius:var(--radius-button); padding:var(--sero-space-3) var(--sero-space-6);
    cursor:pointer; }
  .wr-btn:hover { background:var(--color-accent-dark); border-color:var(--color-accent-dark); }
  .wr-btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .wr-meta { font-size:var(--type-body-sm); color:var(--color-ink-dim); }
  .wr-link { font:inherit; font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-accent-dark); background:none; border:none; padding:0; cursor:pointer;
    text-decoration:underline; text-underline-offset:2px; }
  .wr-link:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; border-radius:var(--sero-radius-sm); }

  /* Section heading. Sits closer to what it titles than to the block above (L2). */
  .wr-sec { display:flex; flex-direction:column; gap:var(--sero-space-3); }
  .wr-sec__head { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wr-sec__title { margin:0; font-size:var(--type-h3); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); }
  .wr-sec__sub { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim); }

  /* Stage cards. Four across on desktop, stacked on a phone. */
  .wr-stages { display:grid; gap:var(--sero-space-4); grid-template-columns:repeat(4, 1fr); }
  .wr-frame--phone .wr-stages { grid-template-columns:1fr; }
  .wr-stage { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-5);
    display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .wr-stage__n { display:inline-flex; align-items:center; justify-content:center;
    width:28px; height:28px; border-radius:var(--sero-radius-full);
    background:var(--color-accent-soft); color:var(--color-accent-dark);
    font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    font-variant-numeric:tabular-nums; }
  .wr-stage__benefit { font-size:var(--type-body); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); line-height:var(--type-leading-snug); text-wrap:balance; }
  .wr-stage__title { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-accent-dark); }
  .wr-stage__body { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); text-wrap:pretty; }

  /* The sample brief, as proof. */
  .wr-brief { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-6);
    display:flex; flex-direction:column; gap:var(--sero-space-4); }
  .wr-brief--hero { padding:clamp(var(--sero-space-6), 3vw, var(--sero-space-8)); }
  .wr-brief__head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between;
    gap:var(--sero-space-3); padding-bottom:var(--sero-space-3);
    border-bottom:1px solid var(--color-border); }
  .wr-brief__who { font-family:var(--type-family-display); font-size:var(--type-h3);
    font-weight:var(--type-weight-semibold); color:var(--color-ink); }
  .wr-brief__tag { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:var(--color-surface-2);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-full);
    padding:var(--sero-space-1) var(--sero-space-3); }
  /* The three parts sit side by side on desktop. Stacked, each line ran to about half
     the card and left the right half empty, which is the balance problem this whole
     prototype is about. */
  .wr-brief__body { display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--sero-space-6); }
  .wr-frame--phone .wr-brief__body { grid-template-columns:1fr; gap:var(--sero-space-4); }
  .wr-brief__row { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wr-brief__label { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); }
  .wr-brief__text { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    line-height:var(--type-leading-relaxed); max-width:var(--measure); text-wrap:pretty; }
  .wr-brief__foot { padding-top:var(--sero-space-3); border-top:1px solid var(--color-border); }

  /* Version B: what usually happens, beside what Sero does. */
  .wr-vs { display:grid; grid-template-columns:1fr 1fr; gap:var(--sero-space-8); }
  .wr-frame--phone .wr-vs { grid-template-columns:1fr; gap:var(--sero-space-6); }
  .wr-col { display:flex; flex-direction:column; gap:var(--sero-space-3); }
  .wr-col__head { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    letter-spacing:var(--type-tracking-caps); text-transform:uppercase; color:var(--color-ink-dim); }
  .wr-pain { background:var(--color-surface-2); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4) var(--sero-space-5);
    font-size:var(--type-body); color:var(--color-ink-dim); line-height:var(--type-leading-snug);
    font-style:italic; min-height:76px; display:flex; align-items:center; }
  .wr-fix { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4) var(--sero-space-5);
    display:flex; gap:var(--sero-space-4); align-items:flex-start; min-height:76px; }
  .wr-fix__body { display:flex; flex-direction:column; gap:var(--sero-space-1); }

  /* Version C: alternating bands, each stage beside a piece of the real screen. */
  .wr-band { display:grid; grid-template-columns:1fr 1fr; gap:var(--sero-space-8);
    align-items:center; padding:var(--sero-space-6) 0; }
  .wr-band + .wr-band { border-top:1px solid var(--color-border); }
  .wr-band--flip .wr-band__text { order:2; }
  .wr-frame--phone .wr-band { grid-template-columns:1fr; gap:var(--sero-space-5); }
  .wr-frame--phone .wr-band--flip .wr-band__text { order:0; }
  .wr-band__text { display:flex; flex-direction:column; gap:var(--sero-space-2);
    max-width:var(--measure-lede); }
  .wr-band__benefit { margin:0; font-family:var(--type-family-display);
    font-size:var(--type-h3); font-weight:var(--type-weight-semibold); color:var(--color-ink);
    line-height:var(--type-leading-snug); text-wrap:balance; }

  /* Version D: the stage rail under the brief. */
  .wr-rail { display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--sero-space-4);
    position:relative; }
  .wr-frame--phone .wr-rail { grid-template-columns:1fr; }
  .wr-rail__step { display:flex; flex-direction:column; gap:var(--sero-space-2);
    padding-top:var(--sero-space-5); border-top:2px solid var(--color-border); }
  .wr-rail__step--on { border-top-color:var(--color-accent); }
  .wr-rail__n { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink-dim); font-variant-numeric:tabular-nums; }
  .wr-rail__step--on .wr-rail__n { color:var(--color-accent-dark); }
  /* The pill only appears on the step that made the brief, so the other three carry an
     invisible copy of it. Without that, one column starts lower than its neighbours. */
  .wr-here--ghost { visibility:hidden; }
  .wr-here { display:inline-flex; align-items:center; gap:var(--sero-space-2);
    font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-accent-dark); background:var(--color-accent-soft);
    border-radius:var(--sero-radius-full); padding:var(--sero-space-1) var(--sero-space-3);
    align-self:flex-start; }

  /* Version E: the stepper walkthrough. */
  .wr-steps { display:flex; flex-wrap:wrap; gap:var(--sero-space-2); }
  .wr-step { font:inherit; font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-full);
    padding:var(--sero-space-2) var(--sero-space-4); cursor:pointer;
    display:inline-flex; align-items:center; gap:var(--sero-space-2); }
  .wr-step:hover { color:var(--color-ink); }
  .wr-step[aria-pressed="true"] { background:var(--color-accent-soft);
    border-color:var(--color-accent); color:var(--color-accent-dark);
    font-weight:var(--type-weight-semibold); }
  .wr-step:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .wr-step__n { font-variant-numeric:tabular-nums; }
  /* min-height, so clicking between steps does not make the panel jump: step 3 (the
     whole brief) is much taller than step 1. */
  .wr-panel { display:grid; grid-template-columns:1fr 1fr; gap:var(--sero-space-8);
    align-items:center; background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-6); min-height:340px; }
  .wr-frame--phone .wr-panel { grid-template-columns:1fr; gap:var(--sero-space-5); }
  .wr-panel__text { display:flex; flex-direction:column; gap:var(--sero-space-2); }

  /* Mock screen pieces. Not nested cards: these sit on the page tint inside a section,
     or inside a band, never inside another card. */
  .wr-mock { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-5);
    display:flex; flex-direction:column; gap:var(--sero-space-3); }
  .wr-panel .wr-mock, .wr-brief .wr-mock { border-color:var(--color-border);
    background:var(--color-surface-2); }
  .wr-mock__label { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); }
  .wr-mock__field { border:1px solid var(--color-border-strong);
    border-radius:var(--radius-input); padding:var(--sero-space-4);
    font-size:var(--type-body-sm); color:var(--color-ink); line-height:var(--type-leading-relaxed);
    background:var(--color-surface); text-wrap:pretty; }
  .wr-mock__ask { font-size:var(--type-body); font-weight:var(--type-weight-medium);
    color:var(--color-ink); line-height:var(--type-leading-snug); text-wrap:pretty; }
  .wr-mock__reply { border:1px solid var(--color-border);
    border-radius:var(--radius-input); padding:var(--sero-space-3) var(--sero-space-4);
    font-size:var(--type-body-sm); color:var(--color-ink-mute); background:var(--color-surface); }
  .wr-mock__line { display:flex; gap:var(--sero-space-3); align-items:flex-start;
    font-size:var(--type-body-sm); color:var(--color-ink); line-height:var(--type-leading-normal); }
  .wr-mock__tick { color:var(--color-positive-text); font-weight:var(--type-weight-semibold); }
  .wr-mock__who { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); }
  .wr-mock__row { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .wr-mock__rowlabel { font-size:var(--type-body-sm); font-weight:var(--type-weight-semibold);
    color:var(--color-ink); }
  .wr-mock__rowtext { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); }

  .wr-foot { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sero-space-4);
    padding-top:var(--sero-space-6); border-top:1px solid var(--color-border); }
`;

// ---- Fragments ----------------------------------------------------------------------

const heroHtml = ({ title = HERO.title, lede = HERO.lede, wide = false } = {}) => `
  <header class="wr-hero${wide ? " wr-hero--wide" : ""}">
    <span class="wr-hero__eyebrow">${HERO.eyebrow}</span>
    <h1 class="wr-hero__title">${title}</h1>
    <p class="wr-hero__lede">${lede}</p>
    <div class="wr-cta">
      <button type="button" class="wr-btn js-noop">${HERO.cta}</button>
      <span class="wr-meta">${HERO.time}</span>
      <button type="button" class="wr-link js-noop">${HERO.video}</button>
    </div>
  </header>`;

const stageCardsHtml = () => `
  <div class="wr-stages">
    ${STAGES.map((s) => `
      <article class="wr-stage">
        <span class="wr-stage__n">${s.n}</span>
        <span class="wr-stage__benefit">${s.benefit}</span>
        <span class="wr-stage__title">${s.title}</span>
        <p class="wr-stage__body">${s.body}</p>
      </article>`).join("")}
  </div>`;

const briefRowsHtml = () => BRIEF_ROWS.map((r) => `
  <div class="wr-brief__row">
    <span class="wr-brief__label">${r.label}</span>
    <p class="wr-brief__text">${r.text}</p>
  </div>`).join("");

const briefHtml = ({ hero = false } = {}) => `
  <div class="wr-brief${hero ? " wr-brief--hero" : ""}">
    <div class="wr-brief__head">
      <span class="wr-brief__who">${SAMPLE_BRIEF.name} · ${SAMPLE_BRIEF.meetingType}</span>
      <span class="wr-brief__tag">Sample brief</span>
    </div>
    <div class="wr-brief__body">${briefRowsHtml()}</div>
    <div class="wr-brief__foot">
      <button type="button" class="wr-link js-noop">See the whole example 1:1</button>
    </div>
  </div>`;

const section = (title, sub, body) => `
  <section class="wr-sec">
    <div class="wr-sec__head">
      <h2 class="wr-sec__title">${title}</h2>
      ${sub ? `<p class="wr-sec__sub">${sub}</p>` : ""}
    </div>
    ${body}
  </section>`;

// The four mock screen pieces, one per stage. Used by versions C and E.
const MOCKS = [
  `<div class="wr-mock">
     <span class="wr-mock__label">What is on your mind about Sofia?</span>
     <div class="wr-mock__field">${GOOD_NOTES_EXAMPLE}</div>
   </div>`,
  `<div class="wr-mock">
     <span class="wr-mock__label">Sero asks</span>
     <span class="wr-mock__ask">When you say the spark has gone, what does that look like on a Tuesday? Is it the talking, or the work itself?</span>
     <div class="wr-mock__reply">Your answer</div>
   </div>`,
  `<div class="wr-mock">
     <span class="wr-mock__label">Your prep brief</span>
     ${BRIEF_ROWS.map((r) => `
       <div class="wr-mock__row">
         <span class="wr-mock__rowlabel">${r.label}</span>
         <p class="wr-mock__rowtext">${r.text}</p>
       </div>`).join("")}
   </div>`,
  `<div class="wr-mock">
     <span class="wr-mock__label">Carried into the next 1:1</span>
     <span class="wr-mock__who">You said you would</span>
     <span class="wr-mock__line"><span class="wr-mock__tick">✓</span><span>Get her into the roadmap review before it is locked.</span></span>
     <span class="wr-mock__who">Sofia said she would</span>
     <span class="wr-mock__line"><span class="wr-mock__tick">✓</span><span>Write up the two review changes she wants to try.</span></span>
   </div>`,
];

// ---- The five versions ---------------------------------------------------------------

// A · Stage ladder. Hero and action, then four stages across, then the brief as proof.
// The safest read: it teaches in one horizontal sweep and never pushes the button down.
const versionA = () => `
  <div class="wr-screen">
    ${heroHtml()}
    ${section("How it works", "Four steps, start to finish.", stageCardsHtml())}
    ${section("What comes out", "The plan a manager walks in with. This one is real, from the example 1:1.", briefHtml())}
  </div>`;

// B · What usually happens, beside what Sero does. Names the problem first, then answers
// it line for line. The most direct at "why should I care", the most confrontational.
const versionB = () => `
  <div class="wr-screen">
    ${heroHtml({ title: "Your next 1:1 does not have to be a guess" })}
    ${section(
      "The four things managers tell us about their 1:1s",
      "And what Sero does about each one.",
      `<div class="wr-vs">
         <div class="wr-col">
           <span class="wr-col__head">What usually happens</span>
           ${PAINS.map((p) => `<div class="wr-pain">“${p}”</div>`).join("")}
         </div>
         <div class="wr-col">
           <span class="wr-col__head">What Sero does</span>
           ${STAGES.map((s) => `
             <div class="wr-fix">
               <span class="wr-stage__n">${s.n}</span>
               <span class="wr-fix__body">
                 <span class="wr-stage__benefit">${s.benefit}</span>
                 <span class="wr-stage__title">${s.title}</span>
               </span>
             </div>`).join("")}
         </div>
       </div>`,
    )}
    ${section("What comes out", "A real brief from the example 1:1.", briefHtml())}
  </div>`;

// C · The zig-zag. Each stage gets a band: the benefit on one side, the piece of the real
// screen on the other. Most informative, longest scroll, closest to a marketing page.
// The blue button appears twice here, which is the one deliberate step outside DESIGN.md's
// one-accent-per-screen rule: it is the same action repeated at the end of a long scroll,
// not a second action competing with the first. If that is not wanted, the footer one
// becomes a ghost button.
const versionC = () => `
  <div class="wr-screen">
    ${heroHtml()}
    <section class="wr-sec">
      ${STAGES.map((s, i) => `
        <div class="wr-band${i % 2 ? " wr-band--flip" : ""}">
          <div class="wr-band__text">
            <span class="wr-stage__n">${s.n}</span>
            <h2 class="wr-band__benefit">${s.benefit}</h2>
            <span class="wr-stage__title">${s.title}</span>
            <p class="wr-stage__body">${s.body}</p>
          </div>
          ${MOCKS[i]}
        </div>`).join("")}
    </section>
    <div class="wr-foot">
      <button type="button" class="wr-btn js-noop">${HERO.cta}</button>
      <span class="wr-meta">${HERO.time}</span>
    </div>
  </div>`;

// D · Brief first, rail underneath. Keeps today's instinct (show the artefact) but fixes
// the balance: one centred column, no aside, and a rail under the brief that says which
// step made it. Least new furniture, closest to what is on the live site today.
const versionD = () => `
  <div class="wr-screen">
    ${heroHtml()}
    ${briefHtml({ hero: true })}
    ${section(
      "Where that came from",
      "Four steps. You do two of them.",
      `<div class="wr-rail">
         ${STAGES.map((s, i) => `
           <div class="wr-rail__step${i === 2 ? " wr-rail__step--on" : ""}">
             <span class="wr-rail__n">Step ${s.n}</span>
             <span class="wr-here${i === 2 ? "" : " wr-here--ghost"}">The brief above</span>
             <span class="wr-stage__benefit">${s.benefit}</span>
             <p class="wr-stage__body">${s.body}</p>
           </div>`).join("")}
       </div>`,
    )}
  </div>`;

// E · The walkthrough. Four steps as a stepper: click one and the panel below shows that
// step, with the real screen beside the benefit. Shows rather than tells, in one screen
// height, no scroll. The most build to get right.
const versionE = (step) => `
  <div class="wr-screen">
    ${heroHtml()}
    ${section(
      "See it in four steps",
      "Click through. Nothing here is saved.",
      `<div class="wr-steps">
         ${STAGES.map((s, i) => `
           <button type="button" class="wr-step js-step" data-step="${i}" aria-pressed="${i === step}">
             <span class="wr-step__n">${s.n}</span><span>${s.title}</span>
           </button>`).join("")}
       </div>
       <div class="wr-panel">
         <div class="wr-panel__text">
           <span class="wr-stage__title">Step ${STAGES[step].n} of 4</span>
           <h3 class="wr-band__benefit">${STAGES[step].benefit}</h3>
           <p class="wr-stage__body">${STAGES[step].body}</p>
         </div>
         ${MOCKS[step]}
       </div>`,
    )}
  </div>`;

const VERSIONS = {
  a: { label: "A · Stage ladder", render: versionA },
  b: { label: "B · Problem and fix", render: versionB },
  c: { label: "C · Zig-zag story", render: versionC },
  d: { label: "D · Brief first", render: versionD },
  e: { label: "E · Walkthrough", render: versionE },
};

const NOTES = {
  a: "Teaches in one horizontal sweep. The button never gets pushed below the fold, and the sample brief becomes proof instead of the explanation. The safe pick.",
  b: "Names the problem before it sells the answer: four things managers actually say, each answered by one step. The most persuasive, the most opinionated.",
  c: "One band per step, benefit on one side and the real screen on the other. Informs hardest, but it is a long scroll and it reads like a marketing page inside the app.",
  d: "Closest to what is live today, rebalanced: the brief is the hero in one centred column, the aside is gone, and the rail underneath says which step produced it.",
  e: "Four steps as a stepper. Click through and watch rough notes turn into a brief, all in one screen height. Shows rather than tells, and costs the most to build.",
};

// ---- Chrome and rendering -------------------------------------------------------------

let version = "a";
let width = "desktop";
let step = 0;

const seg = (label, name, options, current) => `
  <div class="wr-seg-wrap">
    <span class="wr-seg-label">${label}</span>
    <div class="wr-seg" role="group" aria-label="${label}">
      ${options.map(([value, text]) => `
        <button type="button" class="wr-seg__btn js-seg" data-name="${name}" data-value="${value}"
          aria-pressed="${value === current}">${text}</button>`).join("")}
    </div>
  </div>`;

function render(host) {
  const screen = version === "e" ? VERSIONS.e.render(step) : VERSIONS[version].render();
  host.innerHTML = `
    <style>${STYLE}</style>
    <div class="wr-wrap">
      <div class="wr-bar">
        ${seg("Version", "version", Object.entries(VERSIONS).map(([k, v]) => [k, v.label]), version)}
        ${seg("Width", "width", [["desktop", "Desktop"], ["phone", "Phone"]], width)}
      </div>
      <p class="wr-note">${NOTES[version]}</p>
      <div class="wr-frame${width === "phone" ? " wr-frame--phone" : ""}">
        ${screen}
      </div>
    </div>`;

  host.querySelectorAll(".js-seg").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (btn.dataset.name === "version") { version = btn.dataset.value; step = 0; }
      else { width = btn.dataset.value; }
      render(host);
    }),
  );

  host.querySelectorAll(".js-step").forEach((btn) =>
    btn.addEventListener("click", () => {
      step = Number(btn.dataset.step);
      render(host);
    }),
  );

  // Mock affordances that lead nowhere in a prototype.
  host.querySelectorAll(".js-noop").forEach((btn) =>
    btn.addEventListener("click", (e) => e.preventDefault()),
  );
}

// Mounts into a host element provided by the /test gallery stage.
export function mount(root) {
  version = "a";
  width = "desktop";
  step = 0;
  render(root);
}
