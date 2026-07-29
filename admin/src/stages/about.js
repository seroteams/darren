// About — the one-pager. Manager view rebuilt 2026-07-29 as the six-step
// "How Sero works" walkthrough: Carl picked shape C of the gallery prototype
// ("How it works. Three shapes", tests/how-it-works.js) and green-lit it for
// live. The steps, chapters and ghost pictures live in about-steps.ts; this
// stage owns the page around them. Static content, no API. Shared by both apps
// and every role: the manager voice below is ALSO what a logged-out guest sees
// (/about is in the router's shared set), so its copy never assumes chrome a
// stranger can't see.
//
// The member's "What is Sero?" stays in the MEMBER's voice (audit B3): what Sero
// holds about them, what their manager can and can't see, no manager CTA. One
// shared stage, two voices — decided by role at mount.
//
// Pure string renderers so the copy contract is unit-tested (about.test.ts),
// mirroring start-welcome.ts.

import { STAGES, store, isAdmin } from "../state.ts";
import { button } from "../ui/button.ts";
import { icon } from "../ui/icon.js";
import { Eye, Lock, Sparkles } from "lucide";
import { howItWorksHtml } from "./about-steps.ts";

export const ALPHA_LINE = "Early alpha &middot; some things are still being built, and your feedback shapes what comes next.";

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
  return `
    <div class="stage-medium l-stack l-stack--10">
      ${heroHtml({
        title: "How Sero works",
        lede: "From rough notes to a better 1:1, in six steps.",
        actionHtml: `
          <div class="about-hero__action">
            ${button({ label: "Start 1:1", hook: "js-start" })}
            <span class="about-hero__hint">About two minutes of typing.</span>
          </div>`,
      })}

      <section class="about-how">${howItWorksHtml()}</section>

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
