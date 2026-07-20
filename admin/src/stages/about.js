// About — the one-pager (009 Phase 5). What Sero is, what to do first, what to expect,
// and that it's an early alpha. Static content, no API. Reachable by members and admins
// from the nav footer.

import { STAGES, store, isAdmin } from "../state.js";

// The member's "What is Sero?" is written in the MEMBER's voice (audit B3): what Sero holds
// about them, what their manager can and can't see, no manager CTA. A manager keeps the
// how-to-use-it version. One shared stage, two voices — decided by role at mount.
function memberHtml() {
  return `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">What is Sero?</h1>
        <div class="text-ink-dim">How your 1:1s are recorded, and what stays private.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Early alpha</div>
        <p>This is an early version. Some things are still being built, and your feedback shapes what comes next.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What Sero is</div>
        <p>Sero is a tool your manager uses to prepare for your one-to-ones. It helps them come to the conversation ready and focused.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What you can see</div>
        <p>Your 1:1s — the dates and meeting types, so you have a record of when you met. Nothing more, nothing hidden.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What stays private</div>
        <p class="text-ink-dim">Your manager's own prep notes and recaps are theirs — you don't see them, and they're never shared back to you here. Sero doesn't ask you for anything or score you.</p>
      </section>
    </div>
  `;
}

function managerHtml() {
  return `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">What is Sero?</h1>
        <div class="text-ink-dim">A quick helper for your 1:1s.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Early alpha</div>
        <p>This is an early version. Some things are still being built, and your feedback shapes what comes next.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What Sero is</div>
        <p>Sero helps you prepare for a one-to-one with someone on your team. You tell it who you're meeting and what's on your mind, and it writes a short brief to guide the conversation.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What to do first</div>
        <p>Prep a 1:1 from your Home page. It takes a few minutes.</p>
        <button type="button" class="btn js-start">Prep a 1:1</button>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What to expect</div>
        <p class="text-ink-dim">1 &middot; Tell Sero who you're meeting and what's on your mind.</p>
        <p class="text-ink-dim">2 &middot; Pick the focus areas that fit.</p>
        <p class="text-ink-dim">3 &middot; Answer a few short questions.</p>
        <p class="text-ink-dim">4 &middot; Get a recap you can use in the meeting.</p>
      </section>
    </div>
  `;
}

export async function mount(root, { setState }) {
  const memberView = store.user && !isAdmin(store.user);
  root.innerHTML = memberView ? memberHtml() : managerHtml();

  // The Start CTA only exists on the manager version.
  root.querySelector(".js-start")?.addEventListener("click", () => {
    store.scripted = null;
    Object.assign(store.ctx, { personId: null, name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
}

export function unmount() {}
