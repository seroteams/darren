# Phase 2 — The two "Honest read" cards

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Make the private "Honest read — you" card unmistakably different from the shareable "Honest read — them" card, so a manager can never paste their private reflection into shared notes by mistake — and make the "Private" badge actually readable.

## Changes
- **Shareable card → calm and plain.** White background, standard border, a solid mint "OK to share" badge (white text on `--color-positive` `#1aa887`). Area: [admin/src/stages/briefing.js](../../../admin/src/stages/briefing.js) `.brutal` markup + [admin/src/styles/design.css](../../../admin/src/styles/design.css).
- **Private card → clearly walled-off.** Lavender fill + a full lavender border (drop the thin left side-stripe — a single-sided coloured stripe is a flagged anti-pattern; use a full border + tint instead), a small lock icon, and a solid gold "Private · just for you" badge (white text on `#b4690e`, which passes WCAG AA — the current pale-gold-on-tint fails at ~2.85:1).
- **The warning note becomes readable.** "Don't paste this into shared notes" moves from faint italic grey to solid `#b4690e` gold, "Don't" in medium weight, not italic.

## Not in this phase
- Section heading / inline-label work (Phase 1).
- Colour-coding the other cards by state, the engagement-card action promotion, hero block (parked P1/P2).

## Done when
- [ ] The shareable and private cards look like two different kinds of thing at a glance.
- [ ] The "Private · just for you" badge is clearly readable; both badges are solid-fill with white text.
- [ ] The "don't paste" note is easy to read (gold, not faint italic).
- [ ] `npm test` passes (same as baseline).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these on a finished briefing. Next phase (none — this closes P0) waits for your green light.
1. **Twin test** — look at the two "Honest read" cards together. They should read as two clearly different things, not a matched pair. ❌ Not OK if you have to read the badge text to tell which is which.
2. **Could I paste the wrong one?** — imagine quickly copying "the honest read" to share. It should be obvious which card is safe and which is private *before* you read a word. ❌ Not OK if the private one looks copy-ready.
3. **Read the badge** — the "Private · just for you" badge should be easy to read at a glance (white on solid gold), and "OK to share" likewise. ❌ Not OK if either badge looks faint.
4. **Read the warning** — the "don't paste into shared notes" line should be clearly legible. ❌ Not OK if it's still a faint italic afterthought.
5. **Nothing broke** — both cards still show, the wording is unchanged, copy-all still works.
