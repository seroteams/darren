# Phase 7 — Prove it & write it down

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Contrast-verify both themes properly (measured, not eyeballed), lock the new language into
DESIGN.md + the in-app design sheet, and extend the automated guards so it can't drift back.

## Changes
- **Contrast audit, both themes:** every text-on-tint pair, chip variant, and the accent-on-dark
  measured against 4.5:1 (3:1 large/UI); fixes land at the token step so they propagate. (Known
  suspect going in: white-on-mint-800 ≈ 2.2:1.)
- **DESIGN.md updated:** dual-theme mechanism; the sanctioned `--shadow-lift` exception; the
  `.screen` frame; two-tier labels; the one chip spec; the committed-colour-block rule
  (rail/navy); reconciled button spec; dark pairings table (mirror of the light a11y pass).
- **In-app design sheet** (`admin/public/sero-flowbite/` + `stages/design.js`) refreshed — every
  building block shown in both themes.
- **Guard tests extended:** 14px floor + no-literal-colour checks across the design barrel,
  `guided.css`, `members.css`.
- **Comms:** changelog + how-it-works deck refreshed (per the keep-the-guide-updated rule).

## Not in this phase
- Nothing follows — this closes the initiative; folder moves to `docs/plans/done/`.

## Done when
- [ ] Measured contrast table complete; all pairs pass (or consciously recorded as accepted
      deviations, like the light-mode primary button).
- [ ] `npm test` green including new guards; deliberately adding a 12px font or raw hex to a
      design file makes them fail.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **Spot-check** — 8 key screens in dark and light: nothing hard to read. You sign the contrast
   pass.
2. **The sheet is true** — open the in-app design sheet: every building block (chips, buttons,
   labels, frame, dot-meter) shown in both themes, matching what's live.
3. **Guards bite** — I add a deliberate 12px font to a design file in front of you: the test run
   fails; revert: green.
