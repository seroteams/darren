// Share-link modal (audit M11) — replaces the raw window.prompt that used to surface a
// one-time join link. Shows the link in a read-only field with a Copy button and a plain
// "valid 7 days, works once" note, styled like the rest of the app instead of a browser popup.
//
// Resolves when the manager closes it (nothing to return — the link is already sent by email;
// this is the copy-it-too affordance).
//
// Rides the shared modal shell (component-consolidation P1), which is also where it
// picked up the Tab trap it never had.

import { openModalShell } from "./modal-shell.ts";

export function showShareLinkModal(opts: { title: string; message: string; link: string }): Promise<void> {
  return new Promise((resolve) => {
    const titleId = `share-link-title-${Date.now()}`;

    const shell = openModalShell({
      className: "card modal l-stack l-stack--4",
      labelledBy: titleId,
      onClose: () => close(),
      html: `
      <div class="l-stack l-stack--2">
        <h2 class="h3" id="${titleId}"></h2>
        <p class="text-sm text-ink-dim js-msg"></p>
      </div>
      <div class="share-link__row l-cluster l-cluster--2">
        <input class="input js-link" type="text" readonly aria-label="Invite link" />
        <button type="button" class="btn btn--ghost js-copy">Copy</button>
      </div>
      <p class="text-sm text-ink-mute">Valid 7 days · works once.</p>
      <div class="modal__actions">
        <button type="button" class="btn js-done">Done</button>
      </div>
    `,
    });
    const modal = shell.el;

    modal.querySelector<HTMLElement>(`#${titleId}`)!.textContent = opts.title;
    modal.querySelector<HTMLElement>(".js-msg")!.textContent = opts.message;
    const input = modal.querySelector<HTMLInputElement>(".js-link")!;
    input.value = opts.link;
    const copyBtn = modal.querySelector<HTMLButtonElement>(".js-copy")!;
    const doneBtn = modal.querySelector<HTMLButtonElement>(".js-done")!;

    function close() {
      shell.destroy();
      resolve();
    }

    async function copy() {
      input.select();
      let ok = false;
      try {
        await navigator.clipboard?.writeText(input.value);
        ok = true;
      } catch {
        // Fallback for browsers/contexts without the async clipboard API.
        try { ok = document.execCommand("copy"); } catch { ok = false; }
      }
      copyBtn.textContent = ok ? "Copied ✓" : "Press Ctrl+C";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
    }

    copyBtn.addEventListener("click", () => { void copy(); });
    doneBtn.addEventListener("click", close);
    setTimeout(() => { input.focus({ preventScroll: true }); input.select(); }, 0);
  });
}
