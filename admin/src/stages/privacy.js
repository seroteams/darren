// Privacy note — a plain-language explanation of what Sero stores, who can see it, and
// how to delete it (009 Phase 3). Static content, no API. Reachable from the signup
// screen (logged out) and from the nav footer (logged in). Every claim here is true
// against the code: data is fenced by company + role, a run can be deleted from its row,
// account deletion is an honest manual/email path (there's no self-serve endpoint yet),
// ratings (stars + note) are stored per run, and the one cross-company exception — the
// superadmin (Sero-team) read-only view (PG6–PG8) — is disclosed rather than hidden.

import { STAGES, store, isAdmin } from "../state.js";

export async function mount(root, { setState }) {
  const loggedIn = !!store.user;
  // Prefer the page we actually came from (main.js records it on the way in), so
  // Back returns there — e.g. the start screen — instead of always dumping a
  // logged-out visitor on the sign-up form. Fall back to a sensible home.
  const fallback = !loggedIn
    ? STAGES.REGISTER
    : isAdmin(store.user) ? STAGES.START : STAGES.MEMBER_HOME;
  const backStage = store.privacyBack || fallback;
  const backLabel = store.privacyBack ? "← Back" : (loggedIn ? "← Back" : "← Back to sign up");

  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Your data &amp; privacy</h1>
        <div class="text-ink-dim">Plain and short. What Sero keeps, who sees it, and how to remove it.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Early alpha</div>
        <p>Sero is an early version shared with a few managers. Use real notes only if you're comfortable. You can delete a session at any time.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What we store</div>
        <p>The person's name and role, any notes you type when prepping a 1:1, your answers during the prep, and the recap Sero writes for you. If you rate how useful a 1:1 was, we store that star rating and any note you add with it. Nothing more.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Who can see it</div>
        <p>Inside your company, only you and your company's owner. Your data is walled off from every <em>other</em> company. No other customer can see it. During this early alpha, a member of the Sero team can view companies' people, 1:1s and ratings to run and support the trial; we only look to keep things working and we never share it. To write your recap, the text is sent to our AI provider, which processes it to produce the result.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">How to delete it</div>
        <p>You can delete any 1:1 from its row whenever you like. To remove your whole account and company, email <a class="link" href="mailto:carl@seroteams.com">carl@seroteams.com</a> and we'll erase it for you.</p>
      </section>

      <div>
        <button type="button" class="link js-back">${backLabel}</button>
      </div>
    </div>
  `;

  root.querySelector(".js-back").addEventListener("click", () => setState({ stage: backStage }));
}

export function unmount() {}
