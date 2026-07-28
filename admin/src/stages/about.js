// About — the one-pager (009 Phase 5; visual rebuild 2026-07-27, mock approved by
// Carl: ghost-lines sample card). What Sero is, how it works, what comes out, and
// that it's an early alpha. Static content, no API. Shared by both apps and every
// role: the manager voice below is ALSO what a logged-out guest sees (/about is in
// the router's shared set), so its copy never assumes chrome a stranger can't see.
//
// The member's "What is Sero?" stays in the MEMBER's voice (audit B3): what Sero
// holds about them, what their manager can and can't see, no manager CTA. One
// shared stage, two voices — decided by role at mount.
//
// The sample card shows the SHAPE of a brief with ghost lines, never written copy
// posing as engine output (Carl picked A of the mock's A/B, 2026-07-27). Pure
// string renderers so the copy contract is unit-tested (about.test.ts), mirroring
// start-welcome.ts.

import { STAGES, store, isAdmin } from "../state.ts";
import { button } from "../ui/button.ts";
import { icon } from "../ui/icon.js";
import { PenLine, MessagesSquare, FileText, History, Eye, Lock, Sparkles } from "lucide";

// The four steps are the product's real flow, told the same way Home's welcome
// tells it — same order, tighter copy. The order is real, which is the only
// reason they carry numbers.
export const STEPS = [
  { title: "Say what's on your mind", body: "Their name, their role, and rough notes. Half sentences are fine." },
  { title: "Sero asks you back", body: "A short back and forth about what you actually saw, so the plan fits this 1:1." },
  { title: "Walk in with a brief", body: "How to open, what to explore, what to listen for." },
  { title: "The next one picks up here", body: "What you both agreed comes back at the top of your next 1:1." },
];
const STEP_ICONS = [PenLine, MessagesSquare, FileText, History];

export const ALPHA_LINE = "Early alpha &middot; some things are still being built, and your feedback shapes what comes next.";

// The ghost lines. Widths are composition, not data: three rows that read as a
// short document at a glance.
const SAMPLE_ROWS = [
  { label: "How to open", bars: [100, 62] },
  { label: "What to explore", bars: [100, 88, 45] },
  { label: "What to listen for", bars: [100, 71] },
];

function heroHtml({ title, lede, actionHtml = "" }) {
  return `
    <header class="about-hero">
      <div class="eyebrow">What is Sero?</div>
      <h1 class="h1">${title}</h1>
      <p class="about-hero__lede">${lede}</p>
      ${actionHtml}
    </header>`;
}

function alphaStripHtml() {
  return `
    <div class="about-alpha">
      ${icon(Sparkles, { size: 18 })}
      <p>${ALPHA_LINE} <button type="button" class="about-alpha__link js-feedback">Send feedback</button></p>
    </div>`;
}

export function managerHtml() {
  const steps = STEPS.map(
    (s, i) => `
      <div class="about-step card-flat">
        <div class="about-step__top">
          <span class="about-step__n" aria-hidden="true">${i + 1}</span>
          <span class="about-step__icon">${icon(STEP_ICONS[i], { size: 20 })}</span>
        </div>
        <div class="about-step__text">
          <span class="about-step__title">${s.title}</span>
          <p class="about-step__body">${s.body}</p>
        </div>
      </div>`,
  ).join("");

  const sampleRows = SAMPLE_ROWS.map(
    (r) => `
      <div class="about-sample__row">
        <div class="about-sample__label">${r.label}</div>
        <div>${r.bars.map((w) => `<div class="about-ghost" style="width:${w}%"></div>`).join("")}</div>
      </div>`,
  ).join("");

  return `
    <div class="stage-medium l-stack l-stack--10">
      ${heroHtml({
        title: "Walk into every 1:1 with a plan",
        lede: "You tell Sero who you're meeting and what's on your mind. It asks a few questions back, then writes a short brief to guide the conversation.",
        actionHtml: `
          <div class="about-hero__action">
            ${button({ label: "Start 1:1", hook: "js-start" })}
            <span class="about-hero__hint">About two minutes of typing.</span>
          </div>`,
      })}

      <section class="about-sec">
        <div class="about-sec__head">
          <h2 class="about-sec__title">How it works</h2>
          <p class="about-sec__sub">Four short steps from rough notes to a plan.</p>
        </div>
        <div class="about-steps">${steps}</div>
      </section>

      <section class="about-sec">
        <div class="about-sec__head">
          <h2 class="about-sec__title">What comes out</h2>
          <p class="about-sec__sub">A short brief, ready before you walk in. This is the shape of one.</p>
        </div>
        <div class="about-sample" aria-hidden="true">
          <div class="about-sample__paper">
            <p class="about-sample__banner">An example of what Sero writes. <span class="about-sample__tag">Sample brief</span></p>
            <div class="about-sample__head">
              <span class="about-sample__avatar">S</span>
              <span class="about-sample__id">
                <span class="about-sample__name">Sofia</span>
                <span class="about-sample__meta">Bi-weekly check-in &middot; prep brief</span>
              </span>
            </div>
            <div class="about-sample__body">${sampleRows}</div>
          </div>
        </div>
      </section>

      ${alphaStripHtml()}
    </div>
  `;
}

export function memberHtml() {
  return `
    <div class="stage-medium l-stack l-stack--10">
      ${heroHtml({
        title: "Your 1:1s, and what stays private",
        lede: "Sero is a tool your manager uses to prepare for your 1:1s. It helps them come to the conversation ready and focused.",
      })}

      <section class="about-duo">
        <div class="about-duo__card card-flat">
          <div class="about-duo__top">${icon(Eye, { size: 20 })}<span class="about-duo__title">What you can see</span></div>
          <p class="about-duo__body">Your 1:1s. The dates and meeting types, so you have a record of when you met. Nothing more, nothing hidden.</p>
        </div>
        <div class="about-duo__card card-flat">
          <div class="about-duo__top">${icon(Lock, { size: 20 })}<span class="about-duo__title">What stays private</span></div>
          <p class="about-duo__body">Your manager's own prep notes and recaps are theirs. You don't see them, and they're never shared back to you here. Sero doesn't ask you for anything or score you.</p>
        </div>
      </section>

      ${alphaStripHtml()}
    </div>
  `;
}

export async function mount(root, { setState, resetSession }) {
  const memberView = store.user && !isAdmin(store.user);
  root.innerHTML = memberView ? memberHtml() : managerHtml();

  // The Start CTA only exists on the manager version. Same reset as the nav's
  // own Start 1:1 row (app-nav's mgnew), so the two ways in can't drift.
  root.querySelector(".js-start")?.addEventListener("click", () => {
    if (resetSession) resetSession();
    setState({ stage: STAGES.INTAKE, substage: "NAME" });
  });
  root.querySelector(".js-feedback")?.addEventListener("click", () => {
    setState({ stage: STAGES.FEEDBACK });
  });
}

export function unmount() {}
