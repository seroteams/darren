// Member Home — the landing page for a plain member (member-nav Phase 1). Keeps it
// simple: a welcome and one clear way to start a prep session. The admin Home
// (start.js) is a separate, heavier page and is never shown to a member.

import { STAGES, store } from "../state.js";

let keyHandler = null;

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim text-sm">Prep for your next 1:1 in a few minutes.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Start here</div>
        <p class="text-sm">Sero walks you through a quick prep and writes a briefing you can use in the meeting. Here's how it goes:</p>
        <p class="text-sm text-ink-dim">1 &middot; Tell Sero who you're meeting and what's on your mind.</p>
        <p class="text-sm text-ink-dim">2 &middot; Answer a few short questions.</p>
        <p class="text-sm text-ink-dim">3 &middot; Get a briefing to guide the 1:1.</p>
        <button type="button" class="btn js-start">Start a new session</button>
      </section>
    </div>
  `;

  function startNew() {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  }

  root.querySelector(".js-start").addEventListener("click", startNew);

  keyHandler = (e) => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === "Enter") { e.preventDefault(); startNew(); }
  };
  window.addEventListener("keydown", keyHandler);
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
