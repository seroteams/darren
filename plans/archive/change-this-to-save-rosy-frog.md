# Plan: Save & Exit + Start Fresh controls in Questioning header

## Context

In the QUESTIONING stage, the top-right of the header currently shows a passive hint: `<kbd>Enter</kbd> submits`. The user wants to replace that hint with two actionable buttons:

1. **Save & Exit** — end the current run gracefully.
2. **Start Fresh** — abandon the current run and start a brand-new session.

Both buttons must show a generic "Are you sure?" confirmation popup before acting, so a stray click does not destroy in-progress work. The "Enter submits" affordance is already conveyed by the textarea placeholder (`"…Press Enter or click Record & continue."`), so removing the header hint is acceptable.

## Files to modify

- [frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js) — replace the header hint, wire up buttons + confirm flow, clean up SSE/listeners on exit.
- [frontend/client/src/ui/](frontend/client/src/ui/) — add a small new `confirm.js` helper (one reusable function) since no modal primitive exists today.
- [frontend/client/src/styles/](frontend/client/src/styles/) — add `.modal-backdrop` / `.modal` rules to the existing design stylesheet (the `design.css` file referenced by the explorer). Reuse existing tokens: `--sero-z-modal-backdrop`, `--sero-z-modal`, `--sero-radius-modal`, `--sero-elevation-overlay`, `--dur-fast`.

## Implementation

### 1. New helper: `src/ui/confirm.js`

A single exported function:

```js
export function confirmAction({ message, confirmLabel = "Confirm", cancelLabel = "Cancel" }): Promise<boolean>
```

- Renders a backdrop + centered `.card` with the message and two `.btn` / `.btn--ghost` buttons.
- Resolves `true` on confirm, `false` on cancel / backdrop click / Escape.
- Removes itself from the DOM on resolve.
- Traps focus on the confirm button on open.

This matches the project's existing primitive style (`.card`, `.btn`, `.btn--ghost`) — no new design system pieces.

### 2. Header markup change in [frontend/client/src/stages/questioning.js:17-19](frontend/client/src/stages/questioning.js#L17-L19)

Replace:
```html
<div class="text-sm text-ink-mute">
  <span class="kbd">Enter</span> submits
</div>
```
with a flex row of two buttons:
```html
<div class="flex gap-2">
  <button class="btn btn--ghost btn--sm js-save-exit">Save & Exit</button>
  <button class="btn btn--ghost btn--sm js-start-fresh">Start Fresh</button>
</div>
```

(If `.btn--sm` does not exist, fall back to `.btn btn--ghost` — verify when implementing.)

### 3. Wire handlers in `mount()` (after the existing setup, before `showNextQuestion()`)

```js
const saveExitBtn = root.querySelector(".js-save-exit");
const startFreshBtn = root.querySelector(".js-start-fresh");

saveExitBtn.addEventListener("click", async () => {
  const ok = await confirmAction({ message: "Are you sure?" });
  if (!ok) return;
  teardown();
  setState({ stage: STAGES.BRIEFING });   // graceful exit to results view
});

startFreshBtn.addEventListener("click", async () => {
  const ok = await confirmAction({ message: "Are you sure?" });
  if (!ok) return;
  teardown();
  resetSession();                          // clears store + localStorage
  setState({ stage: STAGES.INTAKE, substage: "NAME" });
});
```

Add `import { resetSession } from "../state.js"` (already partially imported — extend the line).

### 4. Centralize teardown

Extract the cleanup currently in `unmountFn` into a local `teardown()` helper so the button handlers can reuse it:

```js
function teardown() {
  if (activeSse) { activeSse.close(); activeSse = null; }
  if (activeEscListener) {
    document.removeEventListener("keydown", activeEscListener);
    activeEscListener = null;
  }
}
unmountFn = teardown;
```

This prevents the in-flight SSE stream and Escape-key listener from firing after the user has navigated away.

### 5. CSS additions

Append to the existing design stylesheet:

```css
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: var(--sero-z-modal-backdrop);
  display: grid; place-items: center;
}
.modal {
  z-index: var(--sero-z-modal);
  max-width: 360px;
  padding: 20px;
}
.modal__actions {
  display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;
}
```

(The modal reuses `.card` for surface styling — only positioning / sizing rules are new.)

## Reused existing pieces

- `STAGES`, `setState`, `resetSession` — [src/state.js:3-51](frontend/client/src/state.js#L3-L51)
- `.card`, `.btn`, `.btn--ghost`, `--sero-z-modal*`, `--sero-radius-modal`, `--sero-elevation-overlay`, `--dur-fast` — existing design tokens (per Explore findings in design.css).
- Header layout (`flex items-baseline justify-between`) — unchanged; only the right-hand child is swapped.

## Verification

1. **Dev server**: start the frontend (`npm run dev` from the project root or the frontend directory — confirm exact script in `package.json` at run time) and walk through:
   - Start a session → reach QUESTIONING.
   - Click **Save & Exit** → confirm dialog appears → Cancel → stay on the current question, textarea still works, Enter still submits.
   - Click **Save & Exit** → Confirm → app navigates to BRIEFING; no console errors; in-flight SSE (if any) does not fire callbacks afterward.
   - Click **Start Fresh** → Confirm → app returns to INTAKE / NAME substage; `localStorage.seroSessionId` is cleared (check DevTools); axes reset.
   - Press Escape inside the confirm dialog → dialog dismisses, no answer is submitted (verify the questioning Escape-listener is suppressed while the modal is open — handled by stopping propagation inside `confirm.js`).
2. **Keyboard regression**: confirm Enter still submits the textarea answer and Escape still triggers the existing "skip" behavior when no modal is open.
3. **Tear-down**: open DevTools Network tab, trigger Start Fresh while an SSE stream is open from a prior answer — the EventSource should be closed (no lingering `plan/stream` connection).
