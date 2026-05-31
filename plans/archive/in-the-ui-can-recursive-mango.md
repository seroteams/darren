# Plan: Realistic Keyboard Key Icons + Shortcut Overlay

## Context
The app uses vanilla JS + Tailwind CSS with a stage-based architecture. Currently keyboard hints exist as simple `.kbd` spans (flat monospace bordered text) in two places: the questioning stage header and intake footer. The user wants realistic 3D keycap-style icons AND a persistent corner overlay showing context-sensitive shortcuts per stage, plus new keyboard shortcuts wired up.

---

## Changes

### 1. Upgrade `.kbd` CSS — `frontend/client/src/styles/design.css` (line 932)

Replace the flat `.kbd` style with a polished 3D keycap appearance:

```css
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.5rem;
  min-width: 1.5rem;
  border: 1px solid var(--sero-charcoal-300);
  border-bottom-width: 3px;
  border-radius: 5px;
  background: linear-gradient(to bottom, #ffffff 0%, var(--sero-soft-400) 100%);
  box-shadow: 0 1px 0 rgba(0,0,0,0.06);
  font-size: 0.7rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 500;
  color: var(--sero-charcoal-700);
  line-height: 1.4;
  white-space: nowrap;
  vertical-align: baseline;
}
```

Also add `.kbd-overlay` styles (the floating panel):

```css
.kbd-overlay {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: var(--sero-z-tooltip);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--sero-radius-md);
  box-shadow: var(--sero-elevation-raised);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 200ms ease, transform 200ms ease;
  pointer-events: none;
}
.kbd-overlay.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.kbd-overlay__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--color-ink-mute);
}
.kbd-overlay__label {
  min-width: 5rem;
}
```

### 2. New component — `frontend/client/src/ui/shortcuts.js` (new file)

```js
export function createShortcutsOverlay(shortcuts) {
  const el = document.createElement("div");
  el.className = "kbd-overlay";
  el.setAttribute("aria-hidden", "true");

  el.innerHTML = shortcuts.map(({ key, label }) => `
    <div class="kbd-overlay__row">
      <span class="kbd-overlay__label">${label}</span>
      ${key.split('+').map(k => `<span class="kbd">${k}</span>`).join('<span style="color:var(--color-ink-mute);font-size:0.65rem">+</span>')}
    </div>
  `).join('');

  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));

  return {
    el,
    destroy() {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 220);
    },
  };
}
```

### 3. New shortcuts + overlay in `questioning.js`

**New keyboard shortcut**: `Esc` = Skip question (safe, doesn't conflict with textarea typing).

In the `showNextQuestion()` function, after setting up the textarea `keydown` listener, add:

```js
const onKeyDown = (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    onSubmit("");  // skip
  }
};
document.addEventListener("keydown", onKeyDown);
// clean up in exitQuestion: document.removeEventListener("keydown", onKeyDown)
```

Mount overlay at stage entry with:
```js
import { createShortcutsOverlay } from "../ui/shortcuts.js";

const overlay = createShortcutsOverlay([
  { key: "Enter", label: "Submit" },
  { key: "Shift+Enter", label: "New line" },
  { key: "Esc", label: "Skip" },
]);
// destroy in unmountFn
```

Update the existing header hint text from `<span class="kbd">Enter</span> submits · empty to skip` to just `<span class="kbd">Enter</span> submits` (the overlay now covers all shortcuts).

### 4. New shortcut + overlay in `bank.js`

When the `ready` SSE fires and the start button renders, bind:
- `Enter` or `Space` → click the start button

```js
const onKeyDown = (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    setState({ stage: STAGES.QUESTIONING, substage: "Q_SHOW", turn: 0 });
    document.removeEventListener("keydown", onKeyDown);
  }
};
document.addEventListener("keydown", onKeyDown);
```

Mount overlay:
```js
const overlay = createShortcutsOverlay([
  { key: "Enter", label: "Start" },
]);
```

---

## Files to modify
- `frontend/client/src/styles/design.css` — upgrade `.kbd`, add `.kbd-overlay` styles
- `frontend/client/src/stages/questioning.js` — add `Esc`=skip shortcut, import + mount overlay, clean up on unmount
- `frontend/client/src/stages/bank.js` — add `Enter`/`Space`=start shortcut, mount overlay, clean up on unmount

## Files to create
- `frontend/client/src/ui/shortcuts.js` — `createShortcutsOverlay(shortcuts)` component

---

## Verification
1. Load the app and navigate to the bank stage — overlay should appear bottom-right showing `Enter  Start`; pressing Enter should trigger start
2. Navigate to questioning stage — overlay shows 3 shortcuts; `Esc` skips the question; `Enter` in textarea submits
3. All existing `.kbd` spans (intake footer, question header) should now render as 3D keycaps
4. Check the overlay fades in smoothly and is destroyed when changing stages
