# Phase 5 — Long-tail sweep (states, spacing, stragglers)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every remaining off-system pocket joins up: error/empty states, overlays, spacing rhythm,
off-barrel CSS — so there are no off-brand corners left.

## Changes
- **Calm errors:** shared coral-triad notice/toast helper in `admin/src/ui/`; swap all ~14
  `window.alert()` call sites; promote `notice()` as the one empty-state builder.
- **Spacing rhythm:** card padding unified onto the role tokens; hairline-row padding to 16px;
  mobile rhythm + `space-y` sweep on the heaviest stages (intake, onepage, briefing, questioning).
- **One overlay recipe** (modal/popover/menu/slide-over) with shared ink-tinted
  `--shadow-overlay`; tasks board de-nested to the hairline-ruled cell pattern (side-stripes
  gone), and its hardcoded `KB_LANE_COLORS` moved onto palette tokens (tokens-only rule).
- **Off-barrel CSS onto tokens:** `row-menu`, `error-log`, `feedback-inbox`, `pulse-drilldowns`,
  `add-person-modal`, `finish-feedback-modal`; extract `admin-pulse.ts`'s inline STYLE string to
  `design/pulse.css`; flatten the gradient hero tile; shared meta-row pattern replaces " · " stat
  dumps.
- **Motion:** duration-token sweep (~14 files); remaining ungated motion (pulse-caret,
  notes/tasks panels, orb) behind reduced-motion.

## Not in this phase
- Contrast audit + docs (Phase 6).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Seen on the running app: tasks board, intake, one-page run, a forced error, reduced-motion
      on.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Calm errors** — make a save fail (e.g. rename a person offline). A calm coral notice card
   appears in the page instead of a browser popup.
2. **Tasks board** — rows read as one card divided by fine lines; no coloured side-stripes, no
   boxes-in-boxes.
3. **Even rhythm** — open intake and the one-page run: section spacing feels even and unhurried;
   on a phone, gaps tighten sensibly.
4. **Reduce motion** — turn it on in your OS: nothing slides, pulses or lifts; things just appear.
