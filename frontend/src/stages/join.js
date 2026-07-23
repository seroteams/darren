// Join screen (member-onboarding-invites) — where a one-time invite link lands. Public:
// the invitee has no account yet. Wears the same auth costume as Log in (design-consolidation
// Phase 2, audit A2/A7): Sero mark on top, then an identity hero naming who invited them
// where (from the token preview). Name + password creates their member account IN THE
// INVITER'S ORG, auto-links their roster person, and logs them straight in — they land on
// "Your 1:1s" (member home). While the token validates the panel stays neutral (no cheerful
// headline that might have to be taken back); a dead/used/expired link gets its own
// plain-words screen with a quiet path to login.

import { STAGES, store } from "../../../admin/src/state.js";
import { getInvite, acceptInvite } from "../../../shared/api.js";
import { escapeHtml as esc, escapeCopy } from "../../../admin/src/ui/html.js";
import { LOGIN_PHOTOS, passwordToggleHtml, wirePasswordToggles } from "../../../admin/src/stages/login.js";

// --- Pure HTML builders (exported for the copy/structure contract tests) -----------------
// Same pattern as welcome.ts: the markup is testable as strings; mount only wires events.

// The org identity tile shows the org's initial ("S" for Sero if the name is somehow empty).
export function orgInitial(name) {
  return (String(name || "").trim().charAt(0) || "S").toUpperCase();
}

// The one-off shell: auth split with the logo pinned on top and a .js-panel host the
// three states (checking / invite form / dead link) render into without re-mounting.
export function shellHtml({ logo, photo }) {
  return `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="${esc(logo)}" alt="" aria-hidden="true" />
          </div>
          <div class="js-panel l-stack l-stack--6"></div>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${esc(photo)}" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;
}

// Neutral while the token validates — deliberately no h1 and no invite copy yet.
export function checkingHtml() {
  return `
    <div class="auth-brand">
      <p class="auth-brand__sub" role="status">Checking your invite…</p>
    </div>
  `;
}

// Dead / used / expired / incomplete link: its own headline, the way back in, and a
// quiet Log in path (an invitee may simply already have an account).
export function deadInviteHtml(message) {
  return `
    <div class="auth-brand">
      <h1 class="auth-brand__title join-hero">This invite link has expired</h1>
      <p class="auth-brand__sub">${escapeCopy(message)}</p>
    </div>
    <p class="text-ink-dim text-sm">
      Already have an account?
      <button type="button" class="link js-to-login">Log in</button>
    </p>
  `;
}

// The happy path: identity hero (org tile + bold names), card-framed form, the compact
// what-you-see / what-stays-private list (member About voice), Privacy link, Log in footer.
export function inviteHtml(invite) {
  const hero = invite.inviterName
    ? `<strong>${esc(invite.inviterName)}</strong> at <strong>${esc(invite.orgName)}</strong> invited you`
    : `You're invited to join <strong>${esc(invite.orgName)}</strong>`;
  return `
    <div class="auth-brand">
      <div class="join-org-tile" aria-hidden="true">${esc(orgInitial(invite.orgName))}</div>
      <h1 class="auth-brand__title join-hero">${hero}</h1>
    </div>
    <form class="card-flat l-stack l-stack--3 js-form" novalidate>
      <label class="l-stack l-stack--2">
        <span class="eyebrow eyebrow--slot">Email</span>
        <input class="input" type="email" value="${esc(invite.email)}" disabled />
      </label>
      <label class="l-stack l-stack--2">
        <span class="eyebrow eyebrow--slot">Your name</span>
        <input class="input js-name" type="text" autocomplete="name" value="${esc(invite.personName || "")}" required />
      </label>
      <label class="l-stack l-stack--2">
        <span class="eyebrow eyebrow--slot">Choose a password <span class="text-ink-mute">(at least 8 characters)</span></span>
        <span class="l-row l-row--2 js-pw-wrap">
          <input class="input js-password" type="password" autocomplete="new-password" required />
          ${passwordToggleHtml()}
        </span>
      </label>
      <p class="js-err text-negative text-sm" hidden></p>
      <button type="submit" class="btn js-submit">Join ${esc(invite.orgName)}</button>
    </form>
    <ul class="join-facts">
      <li>
        <span class="join-facts__label">What you'll see</span>
        <span>Your 1:1s. The dates and 1:1 types, so you have a record of when you met.</span>
      </li>
      <li>
        <span class="join-facts__label">What stays private</span>
        <span>Your manager's own prep notes and recaps. They're never shown to you here.</span>
      </li>
    </ul>
    <p class="text-ink-dim text-sm">
      Sero doesn't ask you for anything or score you.
      <button type="button" class="link js-to-privacy">Privacy note</button>
    </p>
    <p class="text-ink-dim text-sm">
      Already have an account?
      <button type="button" class="link js-to-login">Log in</button>
    </p>
  `;
}

// --- Stage ------------------------------------------------------------------------------

export async function mount(root, { setState }) {
  // Full-bleed split like login — break out of the centered/padded stage default.
  root.classList.add("stage--auth");
  const token = store.joinToken;
  // Same FIRST photo as every other auth screen (deterministic — audit A4).
  const photo = LOGIN_PHOTOS[0];
  root.innerHTML = shellHtml({ logo: `${import.meta.env.BASE_URL}logo.png`, photo });
  const panel = root.querySelector(".js-panel");

  // Every state offers the quiet Log in path; wire whatever the panel currently holds.
  const wireLogin = () =>
    panel.querySelector(".js-to-login")?.addEventListener("click", () => setState({ stage: STAGES.LOGIN }));

  const deadInvite = (message) => {
    panel.innerHTML = deadInviteHtml(message);
    wireLogin();
  };

  panel.innerHTML = checkingHtml();

  if (!token) return deadInvite("This invite link is incomplete. Ask your manager for a fresh invite.");

  let invite;
  try {
    invite = await getInvite(token);
  } catch (e) {
    return deadInvite(e.message || "That invite link isn't valid anymore. Ask your manager for a fresh invite.");
  }

  panel.innerHTML = inviteHtml(invite);
  wireLogin();
  wirePasswordToggles(panel);
  panel.querySelector(".js-to-privacy").addEventListener("click", () => setState({ stage: STAGES.PRIVACY }));

  const form = panel.querySelector(".js-form");
  const err = panel.querySelector(".js-err");
  const submitBtn = panel.querySelector(".js-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    submitBtn.disabled = true;
    try {
      const { user } = await acceptInvite(token, {
        name: panel.querySelector(".js-name").value.trim(),
        password: panel.querySelector(".js-password").value,
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

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
