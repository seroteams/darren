# Phase 5 — Polish + close-out

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Make the one-page run feel finished — good on mobile, kind to reduced-motion, sensible scrolling/focus, clean copy — then close out the job.

## Changes
- Mobile widths: the stacked page reads well on a narrow screen.
- Reduced-motion: respect `prefers-reduced-motion` (no jarring slides); reuse the existing motion tokens.
- Scroll + focus: when a new section appears, scroll lands it nicely (account for any fixed header) and focus goes to the right input.
- Copy pass on any new one-page-specific wording; keep it plain.
- Move `docs/todo/onepage-run/` → `docs/todo/done/onepage-run/` once every phase is ✅.

## Not in this phase
- New features (collapsing settled sections, edit-past, progress rail) — those are Parked in PLAN.md.

## Done when
- [ ] Reads well on a phone-width screen.
- [ ] Calm with reduced-motion turned on.
- [ ] New sections scroll into view nicely and focus the right field.
- [ ] Copy is plain and consistent.
- [ ] `npm test` passes; folder moved to `done/`.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Phone width** — narrow the browser (or use a phone). Do a one-page run; sections stack and read comfortably, nothing overflows or cramps. ❌ Not OK if text is cut off or controls overlap.
2. **Reduced motion** — turn on "reduce motion" in your OS, do a run. New sections should appear calmly without big slides. ❌ Not OK if it still whooshes/janks.
3. **Scroll + focus** — as each new section appears, the page should land on it and the cursor should be ready in the input (you can just start typing). ❌ Not OK if you have to hunt/scroll or click into the box every time.
4. **Reads clean** — the wording throughout is plain and consistent, no jargon or leftover dev text. ❌ Not OK if any label reads confusing or technical.
5. **Full run, top to bottom** — one complete one-page run, start to briefing, feels smooth and finished. ❌ Not OK if any step feels rough or broken.
