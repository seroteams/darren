// Feedback — a short note a tester sends the team (009 Phase 5). Posts to
// /api/v1/feedback (login required, any role); the note is stored on the server, no
// external service. On success the form is replaced with a thanks state.

import { submitFeedback } from "../../../shared/api.js";

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Send feedback</h1>
        <div class="text-ink-dim text-sm">Tell us what's working or what's not — it goes straight to the team.</div>
      </header>
      <form class="card-flat space-y-3 js-form" novalidate>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Your note</span>
          <textarea class="input js-message" rows="5" placeholder="What's on your mind?"></textarea>
        </label>
        <p class="js-err text-negative text-sm" hidden></p>
        <button type="submit" class="btn js-submit">Send</button>
      </form>
    </div>
  `;

  const form = root.querySelector(".js-form");
  const messageEl = root.querySelector(".js-message");
  const submitBtn = root.querySelector(".js-submit");
  const err = root.querySelector(".js-err");

  function showError(message) {
    err.textContent = message;
    err.hidden = false;
  }

  async function onSubmit(e) {
    e.preventDefault();
    err.hidden = true;
    const message = messageEl.value.trim();
    if (!message) { showError("Write a short note first."); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    try {
      await submitFeedback(message);
      root.querySelector(".stage-inner").innerHTML = `
        <header class="page-header">
          <h1 class="h1">Thanks!</h1>
          <div class="text-ink-dim text-sm">Your note reached the team. We read every one.</div>
        </header>
      `;
    } catch (e2) {
      showError(e2.message || "Could not send your feedback.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send";
    }
  }

  form.addEventListener("submit", onSubmit);
  requestAnimationFrame(() => messageEl.focus({ preventScroll: true }));
}

export function unmount() {}
