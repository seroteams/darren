# Phase 1 — Headings & label hierarchy

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Make the briefing's section titles read as real headings, and make every small label dark enough to read — so the page has a clear top-to-bottom structure at a glance.

## Changes
- **Section titles become headings.** The blocks currently labelled with the small grey uppercase "eyebrow" style — "What stood out", "What we understood", "Final read", "How engaged they seem", "What to do next", "Reminders", and the "Honest read —" labels — get a proper heading look: sentence case, ~18px, solid ink (`--color-ink`), normal case (not letter-spaced capitals). Area: [admin/src/stages/briefing.js](../../../../admin/src/stages/briefing.js) markup + a new heading class in [admin/src/styles/design.css](../../../../admin/src/styles/design.css).
- **Reserve the small caps style for inline labels only.** The tiny inline labels inside the cards (Why / Still missing / Your move / Watch next, and the axis tags Engagement / Clarity / Growth) keep their small label style.
- **Contrast fix.** Recolour those small labels and secondary text that sit on tinted backgrounds from the muted grey `#757575` to `#636363` so they pass WCAG AA. One token change covers the section eyebrows, the inline labels, and the "don't paste" note.

## Not in this phase
- The two "Honest read" cards' colour/shape differentiation and their badges — that's Phase 2 (the note's contrast is touched here only as part of the global grey swap; its full restyle is Phase 2).
- Any new hero block, action promotion, or colour-coding (parked P1/P2).

## Done when
- [ ] Section titles on the briefing render as sentence-case headings, visibly larger/heavier than the inline labels.
- [ ] Inline labels and secondary text are legible on white, lavender, and the pale-blue page (no faint grey on tint).
- [ ] `npm test` passes (same as baseline).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself on a finished briefing (run a session through to the end, or open a completed run). Next phase waits for your green light.
1. **Scan test** — glance at the briefing for two seconds. You should be able to tell where each section starts (the titles stand out as headings). ❌ Not OK if it still reads as a wall of same-sized grey capitals.
2. **Heading vs label** — look at a section title (e.g. "How engaged they seem") next to an inline label (e.g. "Why"). The title should clearly look bigger/heavier and be normal sentence case. ❌ Not OK if they look the same.
3. **Read the faint bits** — find the small labels sitting on the lavender card and on the pale-blue page. Every one should be comfortably readable, not washed out.
4. **Nothing broke** — the briefing still shows all its sections, copy buttons still work, and the wording is unchanged. Only the look of the titles/labels changed.
