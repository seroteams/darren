# Phase 3 — Run pipeline on a phone

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done — green-lit by Carl 2026-07-05 ("commit, its good")

> Build notes (2026-07-05): less to do than planned — the flow glossary and stage-review
> overlay already handle phones (existing `min()`/`dvh` sizing), and the answer-button row
> already wrapped. Landed below 480px: axis bars restack (name + score on top, full-width
> bar below — the old 3-column grid left the bar ~6 characters wide), briefing action-row
> labels sit above their text, interview answer buttons become stacked full-width thumb
> targets. Plus: the confirm/alert modal (glossary, delete-session) now caps to the screen
> and scrolls inside — pulled forward from Phase 4 because the glossary is a Phase 3
> scenario; verified live at 375px (glossary fits, 780px tall, scrolls). Axis + button
> stacking verified with injected markup at 375px; a real run's screens are your walk —
> no paid run was made.

## Goal
A manager can run a complete 1:1 prep — intake to briefing — on a phone: type answers with the keyboard up, hit every button with a thumb, read the briefing without pinching.

## Changes
- `admin/src/styles/design.css` — restack the pipeline's fixed-column grids below 640px (the `7rem 1fr 5rem`, `8rem 1fr`, `minmax(7rem,32%) 1fr` rows; briefing + bank lists); questioning-card action row becomes stacked full-width buttons; stage-review overlay + glossary popover sized to the viewport.
- Screens: intake, flow (onepage), focus points, preparation, bank, interview (questioning), eval, briefing, debrief.
- Check textarea focus with the fixed header (keyboard must not hide the caret); fix scroll-into-view if needed.
- No stage-logic changes — CSS plus at most small class hooks.

## Not in this phase
- Admin tooling screens (Phases 4–5).

## Done when
- [ ] A full scripted run walks end-to-end at 375px with no sideways scroll and no hidden inputs.
- [ ] Free checks green: `npm test`, `npm run typecheck:admin`, admin build.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
No paid run needed — use the dev prefill / an existing run for the reading screens; a live run is your call (~$0.35).
1. **The full walk** — on your phone, start a new session and go intake → focus points → preparation → bank → interview → eval → briefing → debrief. Every screen fits; every button reachable with a thumb.
2. **Typing** — in the interview, tap an answer box. The keyboard opens and you can see what you're typing. ❌ Not OK if the box hides under the header or keyboard.
3. **Notes mid-interview** — open notes during the interview, add one, close. Back where you were.
4. **Briefing readable** — the final briefing (axes, patterns, actions) reads without pinching or sideways scroll.
5. **Glossary + stage review** — open the glossary and the stage-review overlay mid-run. Both fit the screen and close cleanly.
