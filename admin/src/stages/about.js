// About — the one-pager (009 Phase 5). What Sero is, what to do first, what to expect,
// and that it's an early alpha. Static content, no API. Reachable by members and admins
// from the nav footer. (Named ABOUT, not ONEPAGE — ONEPAGE is the run-flow stage.)

import { STAGES, store } from "../state.js";

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">What is Sero?</h1>
        <div class="text-ink-dim text-sm">A quick helper for your 1:1s.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Early alpha</div>
        <p class="text-sm">This is an early version. Some things are still being built, and your feedback shapes what comes next.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What Sero is</div>
        <p class="text-sm">Sero helps you prepare for a one-to-one with someone on your team. You tell it who you're meeting and what's on your mind, and it writes a short briefing to guide the conversation.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What to do first</div>
        <p class="text-sm">Start a session from your Home page. It takes a few minutes.</p>
        <button type="button" class="btn js-start">Start a 1:1</button>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What to expect</div>
        <p class="text-sm text-ink-dim">1 &middot; Tell Sero who you're meeting and what's on your mind.</p>
        <p class="text-sm text-ink-dim">2 &middot; Pick the focus areas that fit.</p>
        <p class="text-sm text-ink-dim">3 &middot; Answer a few short questions.</p>
        <p class="text-sm text-ink-dim">4 &middot; Get a briefing you can use in the meeting.</p>
      </section>
    </div>
  `;

  root.querySelector(".js-start").addEventListener("click", () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
}

export function unmount() {}
