// Privacy note — a plain-language explanation of what Sero stores, who can see it, and
// how to delete it (009 Phase 3). Static content, no API. Reachable from the signup
// screen (logged out) and from the nav footer (logged in). Every claim here is true
// against the code: data is fenced by company + role, a run can be deleted from its row,
// account deletion is an honest manual/email path (there's no self-serve endpoint yet),
// ratings (stars + note) are stored per run, and the one cross-company exception — the
// superadmin (Sero-team) read-only view (PG6–PG8) — is disclosed rather than hidden.
// Design-consolidation Phase 2: the shared breadcrumb at the top replaces the old
// bottom "← Back" link (Breadcrumb Rule), still honouring where the reader came from;
// "Who can see it" reads as a label/value list instead of one dense paragraph.

import { STAGES, store, isAdmin } from "../state.js";
import { breadcrumb } from "../ui/breadcrumb.ts";

// Human names for the places a reader can arrive from (store.privacyBack) — the first
// crumb names the page the trail returns to.
const CRUMB_LABELS = {
  [STAGES.WELCOME]: "Start",
  [STAGES.LOGIN]: "Log in",
  [STAGES.REGISTER]: "Create account",
  [STAGES.JOIN]: "Join",
  [STAGES.ABOUT]: "About",
  [STAGES.FEEDBACK]: "Feedback",
  [STAGES.MEMBER_HOME]: "Your 1:1s",
  [STAGES.START]: "Home",
};

export async function mount(root, { setState }) {
  const loggedIn = !!store.user;
  // Prefer the page we actually came from (main.js records it on the way in), so
  // the breadcrumb returns there — e.g. the start screen — instead of always dumping
  // a logged-out visitor on the sign-up form. Fall back to a sensible home.
  const fallback = !loggedIn
    ? STAGES.REGISTER
    : isAdmin(store.user) ? STAGES.START : STAGES.MEMBER_HOME;
  const backStage = store.privacyBack || fallback;
  const backLabel = CRUMB_LABELS[backStage] || "Back";

  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header l-stack l-stack--2">
        ${breadcrumb([{ label: backLabel, nav: "back" }, { label: "Your data & privacy" }])}
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
        <ul class="join-facts">
          <li>
            <span class="join-facts__label">You</span>
            <span>Everything Sero stores for your account.</span>
          </li>
          <li>
            <span class="join-facts__label">Your company's owner</span>
            <span>The same, inside your company only. Your data is walled off from every other company; no other customer can see it.</span>
          </li>
          <li>
            <span class="join-facts__label">Sero team, during alpha</span>
            <span>Can view companies' people, 1:1s and ratings to run and support the trial. We only look to keep things working and we never share it.</span>
          </li>
          <li>
            <span class="join-facts__label">AI provider, for recap text</span>
            <span>To write your recap, the text is sent to our AI provider, which processes it to produce the result.</span>
          </li>
        </ul>
        <p>If you're a team member, your manager's own prep notes and recaps are theirs. You don't see them, and they're never shown to you here.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">How to delete it</div>
        <p>You can delete any 1:1 from its row whenever you like. To remove your whole account and company, email <a class="link" href="mailto:carl@seroteams.com">carl@seroteams.com</a> and we'll erase it for you.</p>
      </section>
    </div>
  `;

  root.querySelector(".js-crumb")?.addEventListener("click", () => setState({ stage: backStage }));
}

export function unmount() {}
