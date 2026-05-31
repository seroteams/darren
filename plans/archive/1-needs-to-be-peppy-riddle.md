# Focus Points Page — UX Polish

## Context
The focus points selection screen has three usability gaps: (1) the selectable rows look like static text — no affordance that they're clickable, (2) there are no keyboard shortcuts even though the AI-generated focus areas may not be ideal and fast selection/rejection matters, (3) the heading hierarchy has redundant labels that clutter the top of the page.

## Files to change

- `frontend/client/src/stages/focus-points.js`
- `frontend/client/src/styles/design.css`

---

## 1. Heading structure

**Problem:** Three stacked micro-labels before any real content:
- Static `"Focus points"` eyebrow (mount header)
- `"Meeting"` eyebrow (result header)
- `"Select 1–3 focus points"` eyebrow (instruction)

**Fix in `focus-points.js`:**
- Remove the `<header class="space-y-1">` block with the `"Focus points"` eyebrow from `mount()` (lines 11-13). The thinking orb already labels the loading state.
- Remove the `"Meeting"` eyebrow inside `renderResult` — the meeting type h3 is self-evident.
- Upgrade `"Select 1–3 focus points"` from eyebrow to a proper instruction line: replace `<div class="eyebrow mb-2 reveal">Select 1–3 focus points</div>` with `<p class="focus-select-hint reveal">Choose 1–3 focus areas to explore</p>`.

**Fix in `design.css`:**
```css
.focus-select-hint {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-ink-dim);
  margin-bottom: 0.75rem;
}
```

---

## 2. Selection affordance

**Problem:** Items look like a plain text list. The selected state uses a fallback purple (`rgba(139,92,246,0.12)`) — `--color-accent-subtle` is undefined in this design system.

**Fix in `focus-points.js` — update button template:**
```html
<button class="focus-point focus-point--selectable js-fp" ...>
  <div class="focus-point__num">${i + 1}</div>
  <div class="focus-point__body">
    <div class="focus-point__label">…</div>
    <div class="focus-point__reason">…</div>
  </div>
  <div class="focus-point__check" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
</button>
```

**Fix in `design.css`:**
```css
/* Update grid to 3 cols on selectable */
.focus-point--selectable {
  grid-template-columns: 1.75rem 1fr 1.5rem;
  border: 1.5px solid transparent;
  border-radius: 0.5rem;
  margin: 0 -0.75rem;
  padding: 0.875rem 0.75rem;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.focus-point--selectable:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-border-strong);
}
.focus-point--selectable.is-selected {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
}
.focus-point__check {
  color: var(--color-border-strong);
  align-self: center;
  flex-shrink: 0;
  transition: color 0.12s ease, opacity 0.12s ease;
  opacity: 0.4;
}
.is-selected .focus-point__check {
  color: var(--color-accent);
  opacity: 1;
}
```

---

## 3. Keyboard shortcuts

**Fix in `focus-points.js`:**

Import `createShortcutsOverlay`:
```js
import { createShortcutsOverlay } from "../ui/shortcuts.js";
```

After rendering buttons, add:
```js
const fpButtons = Array.from(resultHost.querySelectorAll(".js-fp"));

function handleKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-9]$/.test(e.key)) {
    const btn = fpButtons[Number(e.key) - 1];
    if (btn) btn.click();
  }
  if (e.key === "Enter") {
    const cont = resultHost.querySelector(".js-continue");
    if (cont && !cont.disabled) cont.click();
  }
}
document.addEventListener("keydown", handleKey);

const overlay = createShortcutsOverlay([
  { key: "1–4", label: "Toggle focus" },
  { key: "↵",   label: "Continue" },
]);
```

Extend the existing `unmountFn` to clean up:
```js
unmountFn = () => {
  sse.close();
  document.removeEventListener("keydown", handleKey);
  overlay.destroy();
};
```

---

## Verification

1. Open the app at `localhost:3000`, run through intake to reach the focus points screen.
2. **Heading:** Confirm only `"Performance & feedback"` h3 + subtitle + `"Choose 1–3 focus areas…"` instruction — no stacked eyebrows.
3. **Selection:** Hover a row — blue background + border appears. Click — accent border + checkmark circle lights up. Click again — deselects. Confirm max 3 enforced.
4. **Keyboard:** Press `1`, `2`, `3` — rows toggle. Press `↵` once ≥1 selected — proceeds to preparation. Confirm overlay is visible and cleans up on stage change.
