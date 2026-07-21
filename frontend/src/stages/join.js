// Join screen (member-onboarding-invites) — where a one-time invite link lands. Public:
// the invitee has no account yet. Shows who invited them where (from the token preview),
// then name + password creates their member account IN THE INVITER'S ORG, auto-links
// their roster person, and logs them straight in — they land on "Your 1:1s" (member
// home). A dead/used/expired link gets a plain-words message and a path to login.

import { STAGES, store } from "../../../admin/src/state.js";
import { getInvite, acceptInvite } from "../../../shared/api.js";
import { escapeHtml as esc } from "../../../admin/src/ui/html.js";

export async function mount(root, { setState }) {
  const token = store.joinToken;
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8 auth-card">
      <header class="page-header">
        <h1 class="h1">Join your team on Sero</h1>
        <div class="text-ink-dim js-lede">Checking your invite…</div>
      </header>
      <div class="js-host"></div>
    </div>
  `;
  const lede = root.querySelector(".js-lede");
  const host = root.querySelector(".js-host");

  const deadInvite = (message) => {
    lede.textContent = "This link didn't work.";
    host.innerHTML = `
      <section class="card-flat space-y-3">
        <p>${esc(message)}</p>
        <button type="button" class="btn btn--ghost js-to-login">Log in</button>
      </section>`;
    host.querySelector(".js-to-login").addEventListener("click", () => setState({ stage: STAGES.LOGIN }));
  };

  if (!token) return deadInvite("This invite link is incomplete. Ask your manager to send it again.");

  let invite;
  try {
    invite = await getInvite(token);
  } catch (e) {
    return deadInvite(e.message || "That invite link isn't valid anymore.");
  }

  const inviter = invite.inviterName ? `${invite.inviterName} at ` : "";
  lede.textContent = `${inviter}${invite.orgName} invited you. Your 1:1 history is waiting.`;
  host.innerHTML = `
    <form class="card-flat space-y-3 js-form" novalidate>
      <p class="text-ink-dim">Your manager preps your 1:1s with Sero. Once you join,
      you'll see your own 1:1 history: dates and 1:1 types, always.</p>
      <label class="l-stack l-stack--2">
        <span class="eyebrow">Email</span>
        <input class="input" type="email" value="${esc(invite.email)}" disabled />
      </label>
      <label class="l-stack l-stack--2">
        <span class="eyebrow">Your name</span>
        <input class="input js-name" type="text" autocomplete="name" value="${esc(invite.personName || "")}" required />
      </label>
      <label class="l-stack l-stack--2">
        <span class="eyebrow">Choose a password <span class="text-ink-mute">(at least 8 characters)</span></span>
        <input class="input js-password" type="password" autocomplete="new-password" required />
      </label>
      <p class="js-err text-negative text-sm" hidden></p>
      <button type="submit" class="btn js-submit">Join ${esc(invite.orgName)}</button>
    </form>`;

  const form = host.querySelector(".js-form");
  const err = host.querySelector(".js-err");
  const submitBtn = host.querySelector(".js-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    submitBtn.disabled = true;
    try {
      const { user } = await acceptInvite(token, {
        name: host.querySelector(".js-name").value.trim(),
        password: host.querySelector(".js-password").value,
      });
      // Logged in by the accept (cookie set server-side) — land on "Your 1:1s".
      setState({ user: { userId: user.id, orgId: user.orgId, roles: [user.role], email: user.email, name: user.name }, joinToken: null, stage: STAGES.MEMBER_HOME });
    } catch (e2) {
      err.textContent = e2.message || "Couldn't join. Please try again.";
      err.hidden = false;
      submitBtn.disabled = false;
    }
  });
}

export function unmount() { /* nothing */ }
