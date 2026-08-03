// Test: "The last 1:1, on the walk-in screen" — mock only: hardcoded data, zero API and
// engine calls, nothing saved. Opened from /test.
//
// Why this prototype exists. "Before you walk in" is the last screen before a 1:1 starts,
// and its right half is nearly dead weight today: the prep brief's three generic
// listen-for cues, and four rows that all say "Not rated". On a REPEAT 1:1 Sero already
// holds the whole of last time and shows none of it there.
//
// Round 2 (2026-08-03). Round 1 put the FULL last meeting on the right: headline,
// three summary bullets, every question with the note typed against it, and the agreed
// list, behind a two-segment toggle. Carl: "wrong direction completely, it should be 20s
// to read all left and right, quick, view." He is right and the prototype is what proved
// it: the transcript alone ran past 2,200px of scroll in a 560px column, which is a
// reading task, not a glance.
//
// So the panel is now ONE card, no toggle, no tabs, no scroll before the meeting starts:
// last time in a sentence, what was agreed with how it landed, and the four reads as a
// single line. The word count is on screen in the mock chrome, because "20 seconds" is a
// number and this screen should be held to it.
//
// What is deliberately REAL rather than rebuilt, so this walks like the live screen:
// the split and the panel wear the shipped coach-panel.css, and the left card is the real
// readyCardHtml() from questioning-ready.ts. Only the .l11- rules below are new, and they
// carry colour and spacing only: every face still comes from a role in design/type.css.

import "../../styles/coach-panel.css";
import { icon } from "../../ui/icon.js";
import { Ear, MessageCircle } from "lucide";
import { escapeCopy as esc } from "../../ui/html.js";
import { readyCardHtml } from "../questioning-ready.ts";

// ---- Mock data ------------------------------------------------------------------------

const PERSON = "Priya Raman";
const CTX = "Priya Raman · Senior · Senior product designer · Bi-weekly 1:1";

// The left card is the OTHER half of the 20-second budget, and it is engine-written
// (brief.coreIssue + brief.goodOutcome). Both lengths are here so the walk can show what
// the panel alone can and cannot buy: the right half can be made to glance, but the
// screen only gets there if the brief writes shorter too.
const BRIEF_SHORT = {
  coreIssue: "Has the review rota taken work off Priya, or added to it?",
  goodOutcome: "One decision on the rota, and her slice of the billing rewrite.",
};

// The only version that actually reaches 20 seconds: the aim alone. readyReasons() drops
// an empty field on its own, so this needs no change to the shipped card.
const BRIEF_AIM = {
  goodOutcome: "One decision on the rota, and her slice of the billing rewrite.",
};

const BRIEF = {
  coreIssue:
    "Whether the review rota Priya volunteered to run has taken the switching cost off her, or quietly added to it.",
  goodOutcome: "One decision on whether the rota stays, and what her slice of the billing rewrite is.",
  listenFor: [
    "Whether she names a sprint where the rota held without her stepping back in.",
    "If the billing rewrite comes up as her own ask, or only because you raised it.",
    "Whether she describes the guild session as a win or one more thing to carry.",
  ],
};

// The PREVIOUS 1:1, compressed to what a glance needs. Every field is one Sero already
// stores on a finished run: the briefing headline, the confirmed promises with their
// check-in outcomes, and briefing.axes.
const LAST = {
  when: "22 Jul",
  // One sentence. The stored headline is usually longer than this, which is the honest
  // catch worth naming at the walk: a glance needs the engine to write shorter, or this
  // line needs to be a different field.
  line: "Flat because the review cycle eats two days a sprint with nobody owning it.",
  agreed: [
    { owner: "manager", action: "Early context on the billing rewrite", outcome: "yes" },
    { owner: "manager", action: "Back the rota at the guild", outcome: "partly" },
    { owner: "report", action: "Draft the rota and pilot one sprint", outcome: "no" },
  ],
  axes: [
    { label: "Wellbeing", score: -4, read: true },
    { label: "Engagement", score: 5, read: true },
    { label: "Clarity", score: 2, read: true },
    { label: "Growth", score: 0, read: false },
  ],
};

const FIRST_QUESTION = {
  name: "How has the review rota actually gone since you started running it?",
  description: "Her own idea, one sprint in. The hesitation is the data.",
  hints: [
    {
      kind: "ask",
      text: "Ask about the rota before you ask about her. The honest answer comes easier from the mechanism.",
    },
    {
      kind: "listen",
      text: "Whether she is still doing the reviews the rota was meant to hand off.",
    },
  ],
};

// ---- Prototype CSS (scoped .l11-) -----------------------------------------------------
// Colour and spacing ONLY. No font-size, weight, leading or family: coach-panel.css's own
// header says every face on this screen comes from a role in design/type.css.
const STYLE = `
  .l11-card { width: 100%; display: flex; flex-direction: column;
    gap: var(--sero-space-5); }
  .l11-when { color: var(--color-ink-dim); margin: 0; }
  .l11-line { color: var(--color-ink); margin: 0; }

  /* Agreed: one row per item, the chip on the right, nothing wrapping to a second line
     at this measure unless the action genuinely is long. */
  .l11-rows { list-style: none; margin: 0; padding: 0; display: flex;
    flex-direction: column; gap: var(--sero-space-3); width: 100%; }
  .l11-row { display: flex; align-items: baseline; justify-content: space-between;
    gap: var(--sero-space-4); }
  .l11-who { color: var(--color-ink-dim); flex: none; }
  .l11-act { color: var(--color-ink); flex: 1; min-width: 0; }

  /* The four reads as ONE line, not four meters. A glance wants the direction and the
     number, and a meter costs 40px of height each to say the same thing. */
  .l11-scores { display: flex; flex-wrap: wrap; gap: var(--sero-space-2); }

  .l11-sep { border-top: 1px solid var(--color-border); padding-top: var(--sero-space-5); }

  /* Prototype chrome. Lives in the left footer, where runner-v2 puts its mock note. */
  .l11-chrome { display: flex; flex-wrap: wrap; gap: var(--sero-space-4);
    align-items: center; color: var(--color-ink-dim); }
  .l11-switch { display: inline-flex; gap: var(--sero-space-1); align-items: center; }
  .l11-quiet { background: none; border: 0; padding: 0; cursor: pointer;
    color: var(--color-accent-dark); text-decoration: underline; }
  .l11-count { color: var(--color-ink); }
`;

// ---- The glance -----------------------------------------------------------------------

const OUTCOME = {
  yes: { label: "Done", cls: "chip chip--mint chip--dot" },
  partly: { label: "Partly", cls: "chip chip--gold chip--dot" },
  no: { label: "Not done", cls: "chip chip--coral chip--dot" },
  changed: { label: "Changed", cls: "chip chip--plain chip--dot" },
};

function agreedRow(p) {
  const o = OUTCOME[p.outcome] || OUTCOME.changed;
  const who = p.owner === "manager" ? "You" : PERSON.split(" ")[0];
  return `<li class="l11-row">
    <span class="l11-who">${esc(who)}</span>
    <span class="l11-act">${esc(p.action)}</span>
    <span class="${o.cls}">${o.label}</span>
  </li>`;
}

function scoresLine() {
  return `<div class="l11-scores">${LAST.axes
    .map((a) => {
      if (!a.read) return `<span class="chip chip--plain">${esc(a.label)} not read</span>`;
      const cls = a.score > 0 ? "chip chip--mint" : a.score < 0 ? "chip chip--coral" : "chip chip--plain";
      const n = a.score > 0 ? `+${a.score}` : String(a.score);
      return `<span class="${cls}">${esc(a.label)} ${esc(n)}</span>`;
    })
    .join("")}</div>`;
}

// A. Everything agreed, whatever happened to it.
// B. Only what is still open, because a finished promise needs nothing from you today.
function glanceHtml(variant, showScores) {
  const rows = variant === "open" ? LAST.agreed.filter((p) => p.outcome !== "yes") : LAST.agreed;
  const label = variant === "open" ? "Still open" : "You agreed";
  return `<div class="l11-card">
    <div>
      <p class="l11-when">Last 1:1 · ${esc(LAST.when)}</p>
      <p class="l11-line">${esc(LAST.line)}</p>
    </div>
    <div class="l11-sep">
      <span class="eyebrow">${esc(label)}</span>
      <ul class="l11-rows">${rows.map(agreedRow).join("")}</ul>
    </div>
    ${showScores ? `<div class="l11-sep">${scoresLine()}</div>` : ""}
  </div>`;
}

// Today's panel, unchanged: what a FIRST 1:1 still shows, and what the Support tab goes
// back to the moment the meeting starts.
function briefCuesHtml() {
  return `<p class="coach-source">From your prep brief for ${esc(PERSON)}. Written for the whole meeting, not this question.</p>
    ${BRIEF.listenFor
      .map(
        (c) =>
          `<div class="coach-hint"><span class="coach-pill">${icon(Ear, { size: 16 })}Listen for</span><p class="coach-hint__text">${esc(c)}</p></div>`,
      )
      .join("")}`;
}

function questionHintsHtml() {
  return FIRST_QUESTION.hints
    .map((h) => {
      const ask = h.kind === "ask";
      return `<div class="coach-hint"><span class="coach-pill">${icon(ask ? MessageCircle : Ear, { size: 16 })}${ask ? "How to ask" : "Listen for"}</span><p class="coach-hint__text">${esc(h.text)}</p></div>`;
    })
    .join("");
}

function idleScoresHtml() {
  const idle = {
    Wellbeing: "Nothing's touched wellbeing yet. It moves when they talk about energy or load.",
    Engagement: "No engagement signal yet. It moves when they show what they care about.",
    Clarity: "Clarity's unrated so far. It moves when they can (or can't) name priorities cleanly.",
    Growth: "No growth signal yet. It moves when a stretch or ambition comes up.",
  };
  return LAST.axes
    .map(
      (a) => `<div class="coach-row">
      <div class="coach-row__head"><span class="coach-row__label">${esc(a.label)}</span><span class="coach-row__delta coach-row__delta--flat">Not rated</span></div>
      <div class="coach-meter"><span class="coach-meter__mid"></span><span class="coach-meter__thumb" style="left:50%">0</span></div>
      <p class="coach-row__why coach-row__why--idle">${esc(idle[a.label])}</p>
    </div>`,
    )
    .join("");
}

// ---- Mount ----------------------------------------------------------------------------

export function mount(host) {
  // "repeat" = a second 1:1 with this person (the thing being designed)
  // "first"  = nobody has met them yet, so the panel must be today's, untouched
  // "started" = the meeting is running, so the glance is gone
  let state = "repeat";
  let variant = "all"; // "all" (A) or "open" (B)
  let left = "full"; // "full" = the brief as it writes today · "short" = one line each · "aim" = the aim alone
  let scores = true; // last meeting's four reads as a chip line, or nothing
  let mode = "support"; // used by the first / started states only

  const exitToGallery = () => document.querySelector('.js-crumb[data-nav="tests"]')?.click();

  function panelHtml() {
    if (state === "repeat") return glanceHtml(variant, scores);
    if (state === "started") return mode === "scores" ? idleScoresHtml() : questionHintsHtml();
    return mode === "scores" ? idleScoresHtml() : briefCuesHtml();
  }

  function leftHtml() {
    if (state === "started") {
      return `<div class="cp-q space-y-4">
        <h1 class="question-stem leading-snug">${esc(FIRST_QUESTION.name)}</h1>
        <p class="question-desc">${esc(FIRST_QUESTION.description)}</p>
        <label class="block"><span class="sr-only">Your notes</span>
          <textarea class="textarea textarea--question" rows="4" aria-label="Your notes"
            placeholder="Jot what they said. Your shorthand, not a transcript"></textarea></label>
      </div>`;
    }
    return `<div class="cp-q cp-ready space-y-4">${readyCardHtml({
      name: PERSON,
      brief: left === "aim" ? BRIEF_AIM : left === "short" ? BRIEF_SHORT : BRIEF,
      openActions: state === "repeat" ? 2 : 0,
    })}</div>`;
  }

  const stateLabels = [
    { id: "repeat", label: "Repeat 1:1" },
    { id: "first", label: "First 1:1" },
    { id: "started", label: "Meeting started" },
  ];

  // Reading time is the whole brief here, so the mock counts what is actually on screen
  // (both halves) rather than leaving "20 seconds" to feel. 200 words a minute is the
  // usual screen-reading figure, so roughly 3.3 words a second.
  function readingLoad() {
    // Only the two reading columns: not the header, and not this mock's own chrome.
    const words = Array.from(host.querySelectorAll(".cp-col"))
      .map((c) => (c.innerText || "").split(/\s+/).filter(Boolean).length)
      .reduce((a, b) => a + b, 0);
    return { words, secs: Math.round(words / 3.3) };
  }

  function render() {
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="cp-screen">
        <div class="cp-half cp-half--q">
          <header class="cp-head">
            <div class="cp-head__facts">
              <span class="cp-head__turn">${state === "started" ? "Question 1 of 6" : "Before you walk in"}</span>
              <span class="ctx-segments" aria-label="Session context">${esc(CTX)}</span>
            </div>
            <div class="cp-head__actions">
              <button class="btn btn--ghost" type="button" ${state === "started" ? "" : "disabled"}>Wrap up early</button>
            </div>
          </header>
          <div class="cp-col">${leftHtml()}</div>
          <div class="cp-foot">
            <div class="l11-chrome">
              <span>Mock. Nothing is saved.</span>
              <span class="l11-switch">Screen:
                ${stateLabels
                  .map(
                    (s) =>
                      `<button type="button" class="ds-tab js-state${s.id === state ? " is-active" : ""}" data-state="${s.id}">${s.label}</button>`,
                  )
                  .join("")}
              </span>
              ${
                state === "repeat"
                  ? `<span class="l11-switch">Show:
                      <button type="button" class="ds-tab js-variant${variant === "all" ? " is-active" : ""}" data-variant="all">A. Everything agreed</button>
                      <button type="button" class="ds-tab js-variant${variant === "open" ? " is-active" : ""}" data-variant="open">B. Only what's open</button>
                    </span>`
                  : ""
              }
              <span class="l11-switch">Left card:
                <button type="button" class="ds-tab js-left${left === "full" ? " is-active" : ""}" data-left="full">As written</button>
                <button type="button" class="ds-tab js-left${left === "short" ? " is-active" : ""}" data-left="short">One line each</button>
                <button type="button" class="ds-tab js-left${left === "aim" ? " is-active" : ""}" data-left="aim">The aim only</button>
              </span>
              <span class="l11-switch">Scores:
                <button type="button" class="ds-tab js-scores${scores ? " is-active" : ""}" data-scores="1">Show</button>
                <button type="button" class="ds-tab js-scores${scores ? "" : " is-active"}" data-scores="">Hide</button>
              </span>
              <span class="l11-count js-load"></span>
              <button type="button" class="l11-quiet js-gallery">All tests</button>
            </div>
          </div>
        </div>
        <aside class="cp-half cp-half--coach" aria-label="Last 1:1. Only you see this">
          <header class="cp-head">
            ${
              state === "repeat"
                ? `<span class="cp-eyebrow type-label-strong">Last time</span>`
                : `<div class="cp-toggle" role="tablist" aria-label="Coach panel view">
                    <button type="button" class="cp-seg js-seg" data-mode="support" role="tab" aria-selected="${mode === "support"}">Support</button>
                    <button type="button" class="cp-seg js-seg" data-mode="scores" role="tab" aria-selected="${mode === "scores"}">Live scores</button>
                  </div>`
            }
            <span class="cp-privacy">Only you see this. Never ${esc(PERSON)}.</span>
          </header>
          <div class="cp-col"><div class="coach-host"><div class="coach-panel">${panelHtml()}</div></div></div>
          <div class="cp-foot"></div>
        </aside>
      </div>`;

    const load = readingLoad();
    const el = host.querySelector(".js-load");
    if (el) el.textContent = `${load.words} words on screen, about ${load.secs}s to read`;

    host.querySelectorAll(".js-seg").forEach((b) =>
      b.addEventListener("click", () => {
        mode = b.dataset.mode;
        render();
      }));
    host.querySelectorAll(".js-state").forEach((b) =>
      b.addEventListener("click", () => {
        state = b.dataset.state;
        render();
      }));
    host.querySelectorAll(".js-variant").forEach((b) =>
      b.addEventListener("click", () => {
        variant = b.dataset.variant;
        render();
      }));
    host.querySelectorAll(".js-left").forEach((b) =>
      b.addEventListener("click", () => {
        left = b.dataset.left;
        render();
      }));
    host.querySelectorAll(".js-scores").forEach((b) =>
      b.addEventListener("click", () => {
        scores = Boolean(b.dataset.scores);
        render();
      }));
    host.querySelector(".js-gallery")?.addEventListener("click", exitToGallery);
  }

  render();
}
