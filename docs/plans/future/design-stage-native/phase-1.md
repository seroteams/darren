# Phase 1 — Shell scaffold + two-level nav

**Part of:** [plan.md](plan.md) · **Status:** 🔨 awaiting QA

## Goal
Prove the shell: the Design system opens inside the app (main rail stays), with a native second-level rail beside it, scrollspy, a pop-out button, and three real sections.

## Built (2026-07-10)
Files added/edited:
- `admin/src/stages/design.js` (new) — the stage: second-level rail, three sections (rules, colours, type), the ported palette generator (token-driven, hex read from the DOM), scrollspy (one IntersectionObserver, disconnected on unmount), smooth in-page anchors, pop-out button.
- `admin/src/styles/design/design-stage.css` (new) — the two-rail layout (sticky rail, not fixed), swatches, palette ramps, mobile fallback (rail becomes a horizontal scroller under the mobile bar).
- `admin/src/styles/design.css` — imports the new stylesheet.
- `admin/src/state.js` — `STAGES.DESIGN`.
- `admin/src/main.js` — lazy loader for the stage.
- `admin/src/router.js` — `/design` path + reverse map + `ADMIN_ONLY` and `INTERNAL_ONLY` guards.
- `admin/src/ui/app-nav.js` — `design` link gets `stage: STAGES.DESIGN`; click routes via `setState` (was `window.open`); `ACTIVE_BY_STAGE` lights it.

Offline proof: rendered on the autologin dev stack — `/design` renders in-shell (not a new tab), `.ds-stage` + `.ds-rail` + `.ds-content` present, main `.app-nav` still present, 3 rail links, 3 sections, 8 core swatches (hex resolved from tokens, e.g. `primary-700 · #5aa9e6`), 11 palette ramps, no console errors.

## Not in this phase
- The other 21 sections (buttons, inputs, table, toasts, scores, brand, etc.) — Phases 2–5.
- Deleting the old static page — Phase 5.

## Done when
- [x] `/design` renders the stage in-shell with the main rail still showing.
- [x] Second-level rail + scrollspy + pop-out button wired.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these on your running app. Next phase waits for your green light.
1. **Opens in-shell** — click **Design system** in the left rail (Admin group). You should land on a `/design` page *inside the app* — the main left rail still on the far left, no new browser tab. ❌ Not OK if it opens a new tab or the main rail vanishes.
2. **Two-level nav** — a second narrow rail ("Sero design system") sits just to the right of the main rail, listing **Before you build · Colours · Type**. Click each — the page scrolls to that section, and the item you're looking at highlights as you scroll. ❌ Not OK if the rail overlaps the main rail or the highlight never moves.
3. **Sections read right** — "Before you build" shows the 10 rules; "Colours" shows 8 swatches (each with its hex) and a "Full palette" you can expand to all 11 scales; "Type" shows the Bricolage/Inter ramp. Everything in Sero colours, nothing tiny.
4. **Phone width** — narrow the window right down. The second-level rail becomes a horizontal strip you can swipe; no sideways scroll on the page itself.
