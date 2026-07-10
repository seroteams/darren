# Phase 4 — Signature + feedback

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Port the signature Sero pieces and the feedback/state sections, landing a real toast system.

## Changes
- `admin/src/stages/design.js` — add sections: scores, chart card, timeline, toasts & alerts, dropdown & modal, empty & loading states.
- Reuse the real components `createStarRating()` (ui/star-rating.js) and `createAxesPanel()` (ui/axes.js); reuse `.skeleton` (motion.css) and `confirmAction()` (ui/confirm.js) for the modal.
- Author a toast system — `admin/src/ui/toast.js` + `admin/src/styles/design/toast.css` (`showToast()`, slides in bottom-right, auto-dismiss ~4s). None exists today.
- Build showcase-local dropdown menu, tooltip, empty state, spinner, one-line SVG chart, dotted timeline.
- Toast timers/nodes registered for cleanup in the stage's `unmount()` (no orphan toasts after leaving).

## Not in this phase
- Brand / nav / panel (Phase 5).

## Done when
- [ ] Star rating + axis bars are the real app components.
- [ ] "Try a live toast" slides in bottom-right and auto-dismisses; leaving the page mid-toast leaves no orphan node.
- [ ] Modal + dropdown open/close and trap focus.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Scores** — a star rating and the signature axis bars, each next to the sentence that earned it.
2. **Toasts** — success toast, error alert (stays, says what to do), inline warning. Click "Try a live toast" — one slides in bottom-right and disappears after a few seconds.
3. **Overlays** — a dropdown menu and a modal open and close cleanly.
4. **States** — empty state, loading skeleton, spinner, tooltip on hover.
