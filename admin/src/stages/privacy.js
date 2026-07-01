// Privacy note — a plain-language explanation of what Sero stores, who can see it, and
// how to delete it (009 Phase 3). Static content, no API. Reachable from the signup
// screen (logged out) and from the nav footer (logged in). Every claim here is true
// against the code: data is fenced by company + role, a run can be deleted from its row,
// and account deletion is an honest manual/email path (there's no self-serve endpoint yet).

import { STAGES, store, isAdmin } from "../state.js";

export async function mount(root, { setState }) {
  const loggedIn = !!store.user;
  const backStage = !loggedIn
    ? STAGES.REGISTER
    : isAdmin(store.user) ? STAGES.START : STAGES.MEMBER_HOME;
  const backLabel = loggedIn ? "← Back" : "← Back to sign up";

  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Your data &amp; privacy</h1>
        <div class="text-ink-dim text-sm">Plain and short — what Sero keeps, who sees it, and how to remove it.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Early alpha</div>
        <p class="text-sm">Sero is an early version shared with a few managers. Use real notes only if you're comfortable — you can delete a session at any time.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What we store</div>
        <p class="text-sm">The person's name and role, any notes you type when prepping a 1:1, your answers during the prep, and the briefing Sero writes for you. Nothing more.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Who can see it</div>
        <p class="text-sm">Only you and your company's owner. Your data is walled off from every other company — no one outside yours can see it. To write your briefing, the text is sent to our AI provider, which processes it to produce the result.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">How to delete it</div>
        <p class="text-sm">You can delete any run from its row whenever you like. To remove your whole account and company, email <a class="link" href="mailto:carl@seroteams.com">carl@seroteams.com</a> and we'll erase it for you.</p>
      </section>

      <div>
        <button type="button" class="link js-back">${backLabel}</button>
      </div>
    </div>
  `;

  root.querySelector(".js-back").addEventListener("click", () => setState({ stage: backStage }));
}

export function unmount() {}
