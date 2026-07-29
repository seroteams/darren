// The six-step "How Sero works" walkthrough that IS the About page's manager view
// (gallery prototype "How it works. Three shapes", 2026-07-29; Carl picked shape C,
// one flat page with a picture per step, and said "put this live").
//
// Committee rules baked in (log: logs/committee/2026-07-29-how-it-works-clickthrough.html):
//   · The full arc, through the meeting and the loop, never stopping at the brief.
//   · Steps, not details: a line of what happens and a line of what you do.
//   · No fourth vocabulary: each step carries the real stage label from
//     stage-labels.js, so the walkthrough and the app cannot drift apart.
//   · Step 4 (Sero in the meeting with you) carries visual weight.
//   · Chapters Before / In the room / After, matching how managers hold a meeting.
//
// Every picture is a ghost schematic drawn in design tokens: shapes only, never
// written copy posing as engine output (about.test.ts asserts no <text> in them).
// Pure string renderers so the copy contract is unit-tested, mirroring
// start-welcome.ts. House rules: UK English, plain words, no em dashes, 14px floor.

import { STAGE_DISPLAY } from "../ui/stage-labels.js";

export const CHAPTERS = ["Before", "In the room", "After"] as const;
export type Chapter = (typeof CHAPTERS)[number];

export interface HowStep {
  n: number;
  chapter: Chapter;
  title: string;
  line: string;
  you: string;
  /** The label the real screen shows for this part of the flow; step 6 has no
   *  screen of its own (it is the loop), so it names the moment instead. */
  chip: string;
  art: string;
  big?: boolean;
}

// Ghost schematics, viewBox 220x140 across the set so the rows line up.
const ART = {
  notes: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
      <rect class="c" x="14" y="12" width="192" height="116" rx="10"/>
      <rect class="ln" x="30" y="30" width="70" height="7" rx="3.5" opacity="0.55"/>
      <rect class="ln" x="30" y="52" width="150" height="6" rx="3" opacity="0.28"/>
      <rect class="ln" x="30" y="68" width="128" height="6" rx="3" opacity="0.28"/>
      <rect class="ln" x="30" y="84" width="140" height="6" rx="3" opacity="0.28"/>
      <rect class="ln" x="30" y="100" width="92" height="6" rx="3" opacity="0.28"/>
      <rect class="ac" x="128" y="98" width="3" height="11"/>
    </svg>`,
  asks: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
      <rect class="c" x="14" y="14" width="140" height="32" rx="16"/>
      <rect class="ln" x="30" y="27" width="106" height="6" rx="3" opacity="0.4"/>
      <rect class="acs" x="66" y="56" width="140" height="28" rx="14"/>
      <rect class="ln" x="82" y="67" width="96" height="6" rx="3" opacity="0.45"/>
      <rect class="c" x="14" y="94" width="120" height="30" rx="15"/>
      <rect class="ln" x="30" y="106" width="86" height="6" rx="3" opacity="0.4"/>
    </svg>`,
  brief: `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
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
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
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
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
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
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
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
} as const;

export const HOW_STEPS: readonly HowStep[] = [
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

/** The chaptered six-row walkthrough. Pure string, no wiring: the About stage
 *  owns the page around it (hero, CTA, alpha strip). */
export function howItWorksHtml(): string {
  return CHAPTERS.map((cap) => {
    const rows = HOW_STEPS.filter((s) => s.chapter === cap)
      .map(
        (s) => `
        <div class="about-how__row card-flat${s.big ? " about-how__row--big" : ""}">
          <span class="about-step__n" aria-hidden="true">${s.n}</span>
          <div class="about-how__b">
            <div class="about-how__meta">
              <h3 class="about-how__title">${s.title}</h3>
              <span class="about-chip">On screen: ${s.chip}</span>
            </div>
            <p class="about-how__line">${s.line}</p>
            <p class="about-how__you"><b>You:</b> ${s.you}</p>
          </div>
          <span class="about-art" aria-hidden="true">${s.art}</span>
        </div>`,
      )
      .join("");
    return `<div class="about-cap"><span>${cap}</span></div>${rows}`;
  }).join("");
}
