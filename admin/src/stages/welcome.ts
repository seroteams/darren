// The guest-first start screen (start-screen) — the front door at "/" for a
// logged-out visitor. One screen, no scroll: what Sero does, the privacy
// promise, and a single button into a guest run. The login form lives at
// /login; the small links row below the CTA gets you there.

import { STAGES } from "../state.js";
import { startGuestRun } from "../guest.ts";
import { LOGIN_PHOTOS } from "./login.js";
import type { Mount } from "./stage.types.ts";

// Exported for the copy contract test — the markup is fixed by the spec
// (UK English, no exclamation marks, the CTA is the only button).
export function welcomeHtml(photo: string): string {
  return `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="/logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Walk into your next 1:1 prepared.</h1>
            <p class="auth-brand__sub">Sero turns your rough notes into a focused prep brief and sharper questions for your next one-to-one. It takes about two minutes.</p>
          </div>
          <div class="l-stack l-stack--3">
            <p class="text-ink-dim">What you type stays private to you. Nothing is shared with your team or your company.</p>
            <button type="button" class="btn js-try-guest">Try it — no account needed</button>
          </div>
          <p class="text-ink-dim text-sm">
            Already using Sero?
            <button type="button" class="link js-to-login">Log in</button> ·
            <button type="button" class="link js-to-register">Create an account</button> ·
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
