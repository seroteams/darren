// The guest-first start screen (start-screen) — the front door at "/" for a
// logged-out visitor. One screen, no scroll: what Sero does, the privacy
// promise, and a single button into a guest run. The login form lives at
// /login; the small links row below the CTA gets you there.

import { STAGES } from "../../../admin/src/state.js";
import { startGuestRun } from "../../../admin/src/guest.ts";
import { LOGIN_PHOTOS } from "../../../admin/src/stages/login.js";
import type { Mount } from "../../../admin/src/stages/stage.types.ts";

// Exported for the copy contract test — the markup is fixed by the spec
// (UK English, no exclamation marks; the guest CTA is the one blue action,
// with Log in / Create account offered as quieter ghost buttons beside it).
export function welcomeHtml(photo: string): string {
  return `
    <div class="auth-split auth-split--even">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="/logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Going into your 1:1 cold?</h1>
            <p class="auth-brand__sub">Type a few rough notes. Sero turns them into a clear brief and sharper questions, in about two minutes.</p>
          </div>
          <div class="l-stack l-stack--3">
            <button type="button" class="btn js-try-guest">Prep my 1:1 — free, no account</button>
            <p class="auth-alt-label text-ink-dim text-sm">Already using Sero?</p>
            <div class="auth-alt-row">
              <button type="button" class="btn btn--ghost js-to-login">Log in</button>
              <button type="button" class="btn btn--ghost js-to-register">Create account</button>
            </div>
          </div>
          <p class="text-ink-dim text-sm">
            What you type stays private to you.
            <button type="button" class="link js-to-privacy">Privacy</button>
          </p>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${photo}" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;
}

export const mount: Mount = async (root, { setState }) => {
  // Same full-bleed split as the login screen (form left, photo right; the
  // photo drops away below 820px — see the auth CSS).
  root.classList.add("stage--auth");
  const photo = LOGIN_PHOTOS[Math.floor(Math.random() * LOGIN_PHOTOS.length)] || "";
  root.innerHTML = welcomeHtml(photo);

  root.querySelector(".js-try-guest")?.addEventListener("click", () => startGuestRun(setState));
  root.querySelector(".js-to-login")?.addEventListener("click", () => setState({ stage: STAGES.LOGIN }));
  root.querySelector(".js-to-register")?.addEventListener("click", () => setState({ stage: STAGES.REGISTER }));
  root.querySelector(".js-to-privacy")?.addEventListener("click", () => setState({ stage: STAGES.PRIVACY }));
};

// main.js hands unmount the stage's root node (same shape as login.js).
export function unmount(root?: HTMLElement | null): void {
  root?.classList.remove("stage--auth");
}
