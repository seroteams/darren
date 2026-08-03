// Test: "The last 1:1, on the walk-in screen" — the right-hand panel of the walk-in
// gate carrying a review of the PREVIOUS 1:1 with the same person. Mock only:
// hardcoded data, zero API and engine calls, nothing saved. Opened from /test.
//
// Why this prototype exists. "Before you walk in" is the last screen before a 1:1
// starts, and its right half is nearly dead weight today: Support shows the prep
// brief's three generic listen-for cues, and Live scores shows four rows that all
// say "Not rated". On a REPEAT 1:1 Sero already holds the whole of last time and
// shows none of it here, so the manager has to leave the runner and open the
// person page to see any of it.
//
// Carl's calls (2026-08-03), built in:
//   · Discussion = the questions asked and the note typed against each, not a summary.
//   · The review disappears on "Start the meeting". No third tab mid-meeting.
//
// What is deliberately REAL rather than rebuilt, so this walks like the live screen:
//   · the split and the panel wear the shipped coach-panel.css (.cp-screen/.cp-half/
//     .cp-toggle/.coach-hint/.coach-meter), not a prototype copy;
//   · the left card is the real readyCardHtml() from questioning-ready.ts;
//   · Agreed is the real renderPromiseList() from ui/briefing-view.ts, chips and all.
// Only the .l11- rules below are new, and they carry colour and spacing only: every
// size, weight and leading on this screen still comes from design/type.css.
//
// The mock is sized off a real saved run (5 turns, ~150-character notes), because the
// whole question this prototype answers is whether Discussion reads or is a wall.

import "../../styles/coach-panel.css";
import { icon } from "../../ui/icon.js";
import { Ear, MessageCircle, Quote, ListChecks, Sparkles } from "lucide";
import { escapeCopy as esc } from "../../ui/html.js";
import { readyCardHtml } from "../questioning-ready.ts";
import { renderPromiseList } from "../../ui/briefing-view.ts";

// ---- Mock data ------------------------------------------------------------------------

const PERSON = "Priya Raman";
const CTX = "Priya Raman · Senior · Senior product designer · Bi-weekly 1:1";

// This 1:1's prep brief (the left card reads coreIssue + goodOutcome) and its
// listen-for cues (what the Support tab shows today, and again once we start).
const BRIEF = {
  coreIssue:
    "This check-in is about whether the review rota Priya volunteered to run has actually taken the switching cost off her, or quietly added to it.",
  goodOutcome:
    "You and Priya have agreed whether the rota stays, and what she wants her slice of the billing rewrite to be.",
  listenFor: [
    "Whether she names a sprint where the rota held without her stepping back in.",
    "If the billing rewrite comes up as her own ask, or only because you raised it.",
    "Whether she describes the guild session as a win or as one more thing to carry.",
  ],
};

// The PREVIOUS 1:1. Every field here is one Sero already stores on a finished run:
// briefing.headline, briefing.summary_bullets, the transcript, the confirmed
// promises with their check-in outcomes, and briefing.axes.
const LAST = {
  when: "Tue 22 Jul 2026",
  meetingType: "Bi-weekly 1:1",
  headline:
    "Priya is flat for a structural reason, not a personal one: the review cycle eats two days a sprint with nobody owning it, and she has an answer she has not been given room to run.",
  bullets: [
    "The flatness traced to the review cycle rather than the work itself. She was explicit that the payments ship went well and that nothing since has stretched her.",
    "She walked you through the switching cost step by step and arrived at a rota with no owner rotation, which is the first time she has volunteered to lead something cross-team.",
    "The billing rewrite is the thing she wants a real slice of, and she asked for early context so she can plan around it.",
  ],
  turns: [
    {
      q: "What's been on your mind since we last spoke?",
      a: "Honestly a bit flat. The payments ship went well but she seems drained, said the week after has felt like cleanup and PR reviews, nothing stretching her.",
    },
    {
      q: "You said \"honestly a bit flat\". What's behind that for you right now?",
      a: "She opened up. The flatness is mostly the review cycle. Context switching on PR reviews is eating her focus; the work itself is fine but nothing is stretching her.",
    },
    {
      q: "What's been slower or harder than it should have been?",
      a: "The review cycle. She walked me through it step by step. Two days a sprint go to reviews with no owner rotation; she wants to propose a rota.",
    },
    {
      q: "Where is the review switching coming from most right now?",
      a: "",
      skipped: true,
    },
    {
      q: "What kind of mentoring were you hoping to do more of?",
      a: "Clear yes. She named the billing rewrite as the thing she wants a real slice of, and asked for early context so she can plan around it.",
    },
  ],
  // owner + action + outcome, exactly the shape renderPromiseList reads.
  promises: [
    {
      id: "p1",
      owner: "manager",
      action: "Give Priya early context on the billing rewrite before scoping starts.",
      outcome: "yes",
    },
    {
      id: "p2",
      owner: "manager",
      action: "Back the review rota at the guild so she is not selling it alone.",
      outcome: "partly",
    },
    {
      id: "p3",
      owner: "report",
      action: "Draft the rota and pilot it for one sprint.",
      outcome: "no",
    },
  ],
  // briefing.axes: score is the run's own read, not a delta. read_status is authoritative.
  axes: [
    {
      id: "wellbeing",
      label: "Wellbeing",
      score: -4,
      read: true,
      meaning:
        "She described herself as flat and named cleanup and reviews as the cause, so this is load, not mood.",
    },
    {
      id: "engagement",
      label: "Engagement",
      score: 5,
      read: true,
      meaning:
        "She volunteered to own the rota and present it at the guild, which is the first cross-team thing she has put her hand up for.",
    },
    {
      id: "clarity",
      label: "Clarity",
      score: 2,
      read: true,
      meaning:
        "She could name the switching cost precisely and walk you through where it comes from.",
    },
    {
      id: "growth",
      label: "Growth",
      score: 0,
      read: false,
      meaning: "",
    },
  ],
};

// Question 1 of the meeting in progress, so the hand-over is walkable rather than described.
const FIRST_QUESTION = {
  name: "How has the review rota actually gone since you started running it?",
  description: "Her own idea, one sprint in. The hesitation is the data.",
  hints: [
    {
      kind: "ask",
      text: "Ask about the rota before you ask about her. She owns it, so the honest answer comes easier from the mechanism than from how she feels.",
    },
    {
      kind: "listen",
      text: "Whether she is still doing the reviews the rota was meant to hand off. Owning a fix and still absorbing it is the failure mode here.",
    },
  ],
};

// ---- Prototype CSS (scoped .l11-) -----------------------------------------------------
// Colour and spacing ONLY. No font-size, weight, leading or family anywhere in here:
// coach-panel.css's own header says every face on this screen comes from a role in
// design/type.css, and a prototype is not an excuse to open a second type system.
const STYLE = `
  /* .cp-screen's own 50px session-topbar offset is left exactly as it ships. The test
     area draws no topbar in that strip, so it reads as a gap; pulling the overlay up to
     0 instead put the panel header underneath the account badge. */

  /* The note typed against a question, set apart from the question by a rule and
     ink rather than by a size (the panel already separates label from why this way). */
  .l11-said { border-left: 2px solid var(--color-border); padding-left: var(--sero-space-4);
    margin: var(--sero-space-3) 0 0; color: var(--color-ink-dim); }
  .l11-said--skipped { font-style: italic; }

  /* Arrangement B's sub-tabs. .ds-tabs / .ds-tab are the shipped strip used by
     run detail and the person page; they only need the panel's full width. */
  .l11-subtabs { width: 100%; margin-bottom: var(--sero-space-5); }

  /* Overview's bullets share one pill, so they stack inside a single hint block. */
  .l11-stack > .coach-hint__text + .coach-hint__text { margin-top: var(--sero-space-4); }

  /* Prototype chrome. Lives in the left footer, where runner-v2 puts its mock note. */
  .l11-chrome { display: flex; flex-wrap: wrap; gap: var(--sero-space-4);
    align-items: center; color: var(--color-ink-dim); }
  .l11-switch { display: inline-flex; gap: var(--sero-space-1); align-items: center; }
  .l11-quiet { background: none; border: 0; padding: 0; cursor: pointer;
    color: var(--color-accent-dark); text-decoration: underline; }
`;

// ---- Panel views ----------------------------------------------------------------------

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "discussion", label: "Discussion" },
  { id: "agreed", label: "Agreed" },
];

function pill(glyph, label) {
  return `<span class="coach-pill">${icon(glyph, { size: 16 })}${esc(label)}</span>`;
}

function overviewHtml() {
  return `
    <div class="coach-hint">
      ${pill(Sparkles, "The headline")}
      <p class="coach-hint__text">${esc(LAST.headline)}</p>
    </div>
    <div class="coach-hint l11-stack">
      ${pill(Quote, "What stood out")}
      ${LAST.bullets.map((b) => `<p class="coach-hint__text">${esc(b)}</p>`).join("")}
    </div>`;
}

function discussionHtml() {
  const rows = LAST.turns
    .map((t, i) => {
      const said = t.skipped
        ? `<p class="l11-said l11-said--skipped">You skipped this one.</p>`
        : `<p class="l11-said">${esc(t.a)}</p>`;
      return `<div class="coach-hint">
        ${pill(MessageCircle, `Question ${i + 1}`)}
        <p class="coach-hint__text">${esc(t.q)}</p>
        ${said}
      </div>`;
    })
    .join("");
  return `<p class="coach-source">Every question Sero asked, with the note you typed against it.</p>${rows}`;
}

function agreedHtml() {
  return `<p class="coach-source">Agreed at the wrap-up, and how each one landed when you checked it off.</p>
    <div class="coach-hint">
      ${pill(ListChecks, "What you agreed")}
      ${renderPromiseList(LAST.promises, PERSON)}
    </div>`;
}

const SECTION_HTML = { overview: overviewHtml, discussion: discussionHtml, agreed: agreedHtml };

// Arrangement A: all three in one scroll, each under its own heading.
// Arrangement B: one at a time behind the shipped tab strip.
function lastMeetingHtml(layout, section) {
  const head = `<p class="coach-source">${esc(LAST.meetingType)} on ${esc(LAST.when)}.</p>`;
  if (layout === "tabs") {
    const tabs = SECTIONS.map(
      (s) =>
        `<button type="button" class="ds-tab js-section${s.id === section ? " is-active" : ""}" data-section="${s.id}">${s.label}</button>`,
    ).join("");
    return `${head}<div class="ds-tabs l11-subtabs">${tabs}</div>${SECTION_HTML[section]()}`;
  }
  const stacked = SECTIONS.map(
    (s) => `<div class="coach-hint"><span class="eyebrow">${s.label}</span></div>${SECTION_HTML[s.id]()}`,
  ).join("");
  return head + stacked;
}

// Last meeting's four reads. The live meter is a plus/minus 3 DELTA per answer; a
// stored briefing axis is a plus/minus 10 SCORE for the whole meeting, so the scale
// is stated on screen rather than left to look like the live one. An axis the last
// meeting never read says so and draws no meter (the honesty rule the panel and the
// person page both already keep).
const VISUAL_MAX = 6;

function scoreRow(a) {
  const label = `<span class="coach-row__label">${esc(a.label)}</span>`;
  if (!a.read) {
    return `<div class="coach-row">
      <div class="coach-row__head">${label}<span class="coach-row__delta coach-row__delta--flat">Not read</span></div>
      <p class="coach-row__why coach-row__why--idle">Last time never got to this one, so there is no score to carry in.</p>
    </div>`;
  }
  const clamped = Math.max(-VISUAL_MAX, Math.min(VISUAL_MAX, a.score));
  const pct = ((clamped + VISUAL_MAX) / (2 * VISUAL_MAX)) * 100;
  const left = a.score >= 0 ? 50 : pct;
  const width = a.score >= 0 ? pct - 50 : 50 - pct;
  const shown = a.score > 0 ? `+${a.score}` : String(a.score);
  const dir = a.score > 0 ? "up" : a.score < 0 ? "down" : "flat";
  return `<div class="coach-row">
    <div class="coach-row__head">${label}<span class="coach-row__delta coach-row__delta--${dir}">${esc(shown)}</span></div>
    <div class="coach-meter"><span class="coach-meter__mid"></span>
      ${a.score !== 0 ? `<span class="coach-meter__fill" style="left:${left}%;width:${width}%"></span>` : ""}
      <span class="coach-meter__thumb" style="left:${pct}%">${esc(shown)}</span>
    </div>
    ${a.meaning ? `<p class="coach-row__why">${esc(a.meaning)}</p>` : ""}
  </div>`;
}

function lastScoresHtml() {
  return `<p class="coach-source">Where the four reads landed last time, on a scale of -6 to +6. These are last meeting's, not this one's.</p>
    ${LAST.axes.map(scoreRow).join("")}`;
}

// Today's panel, unchanged: what a FIRST 1:1 with someone still shows, and what the
// Support tab goes back to the moment the meeting starts.
function briefCuesHtml() {
  return `<p class="coach-source">From your prep brief for ${esc(PERSON)}. Written for the whole meeting, not this question.</p>
    ${BRIEF.listenFor.map((c) => `<div class="coach-hint">${pill(Ear, "Listen for")}<p class="coach-hint__text">${esc(c)}</p></div>`).join("")}`;
}

function questionHintsHtml() {
  return FIRST_QUESTION.hints
    .map(
      (h) =>
        `<div class="coach-hint">${pill(h.kind === "ask" ? MessageCircle : Ear, h.kind === "ask" ? "How to ask" : "Listen for")}<p class="coach-hint__text">${esc(h.text)}</p></div>`,
    )
    .join("");
}

function idleScoresHtml() {
  const idle = {
    wellbeing: "Nothing's touched wellbeing yet. It moves when they talk about energy or load.",
    engagement: "No engagement signal yet. It moves when they show what they care about.",
    clarity: "Clarity's unrated so far. It moves when they can (or can't) name priorities cleanly.",
    growth: "No growth signal yet. It moves when a stretch or ambition comes up.",
  };
  return LAST.axes
    .map(
      (a) => `<div class="coach-row">
      <div class="coach-row__head"><span class="coach-row__label">${esc(a.label)}</span><span class="coach-row__delta coach-row__delta--flat">Not rated</span></div>
      <div class="coach-meter"><span class="coach-meter__mid"></span><span class="coach-meter__thumb" style="left:50%">0</span></div>
      <p class="coach-row__why coach-row__why--idle">${esc(idle[a.id])}</p>
    </div>`,
    )
    .join("");
}

// ---- Mount ----------------------------------------------------------------------------

export function mount(host) {
  // "repeat" = a second 1:1 with this person (the thing being designed)
  // "first"  = nobody has met them yet, so the panel must be today's, untouched
  // "started" = the meeting is running, so the review is gone
  let state = "repeat";
  let layout = "stacked"; // "stacked" (A) or "tabs" (B)
  let section = "overview"; // arrangement B only
  let mode = "last"; // "last" | "scores" | "support"

  const exitToGallery = () => document.querySelector('.js-crumb[data-nav="tests"]')?.click();

  // Segment 1 is the review before the meeting and Support once it starts. Two
  // segments either way: the 72px header already wraps below 900px with two
  // (coach-panel.css "Stacked and phone"), so a third is not on offer.
  const segments = () =>
    state === "repeat"
      ? [
          { mode: "last", label: "Last 1:1" },
          { mode: "scores", label: "Live scores" },
        ]
      : [
          { mode: "support", label: "Support" },
          { mode: "scores", label: "Live scores" },
        ];

  function panelHtml() {
    if (state === "repeat") {
      return mode === "scores" ? lastScoresHtml() : lastMeetingHtml(layout, section);
    }
    if (state === "started") {
      return mode === "scores" ? idleScoresHtml() : questionHintsHtml();
    }
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
      brief: BRIEF,
      openActions: state === "repeat" ? 2 : 0,
    })}</div>`;
  }

  const stateLabels = [
    { id: "repeat", label: "Repeat 1:1" },
    { id: "first", label: "First 1:1" },
    { id: "started", label: "Meeting started" },
  ];

  function render() {
    if (state !== "repeat" && mode === "last") mode = "support";
    if (state === "repeat" && mode === "support") mode = "last";
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
                  ? `<span class="l11-switch">Layout:
                      <button type="button" class="ds-tab js-layout${layout === "stacked" ? " is-active" : ""}" data-layout="stacked">A. Stacked</button>
                      <button type="button" class="ds-tab js-layout${layout === "tabs" ? " is-active" : ""}" data-layout="tabs">B. Sub-tabs</button>
                    </span>`
                  : ""
              }
              <button type="button" class="l11-quiet js-gallery">All tests</button>
            </div>
          </div>
        </div>
        <aside class="cp-half cp-half--coach" aria-label="Coaching. Only you see this">
          <header class="cp-head">
            <div class="cp-toggle" role="tablist" aria-label="Coach panel view">
              ${segments()
                .map(
                  (s) =>
                    `<button type="button" class="cp-seg js-seg" data-mode="${s.mode}" role="tab" aria-selected="${s.mode === mode}">${s.label}</button>`,
                )
                .join("")}
            </div>
            <span class="cp-privacy">Only you see this. Never ${esc(PERSON)}.</span>
          </header>
          <div class="cp-col"><div class="coach-host"><div class="coach-panel">${panelHtml()}</div></div></div>
          <div class="cp-foot"></div>
        </aside>
      </div>`;

    host.querySelectorAll(".js-seg").forEach((b) =>
      b.addEventListener("click", () => {
        mode = b.dataset.mode;
        render();
      }));
    host.querySelectorAll(".js-section").forEach((b) =>
      b.addEventListener("click", () => {
        section = b.dataset.section;
        render();
      }));
    host.querySelectorAll(".js-state").forEach((b) =>
      b.addEventListener("click", () => {
        state = b.dataset.state;
        render();
      }));
    host.querySelectorAll(".js-layout").forEach((b) =>
      b.addEventListener("click", () => {
        layout = b.dataset.layout;
        render();
      }));
    host.querySelector(".js-gallery")?.addEventListener("click", exitToGallery);
  }

  render();
}
