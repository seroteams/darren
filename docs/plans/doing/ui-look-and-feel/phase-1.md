# Phase 1 — Calm the type, fix the freebies

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
One pass over the token layer that visibly re-calms every screen in both apps, plus every
near-free defect fix — maximum visible improvement per file touched, zero layout change.

## Changes
- **Type retune** (`admin/src/styles/design/tokens.css`, `base.css`, `briefing.css`):
  `--type-display` → clamp(30–42px); `.h1`/`.text-display` weight 700→600; pin `--type-h2`;
  `text-wrap: balance` on heading helpers + `.briefing-headline` + `.prep-callout`.
- **New landing-spot tokens** (pure additions, adopted by later phases):
  `--type-tracking-caps` (0.06em) / `--type-tracking-caps-lg` (0.08em); ~6 role spacing tokens
  (`--space-section` 40px, `--space-card-pad`, `--space-page-tail` 96px…); `--shadow-lift`
  (ink-tinted two-layer); `--sero-radius-frame` 18px; `--measure-tight`/`--measure-lede`;
  semantic `-line` hairline tokens (mint/coral/gold/primary triads).
- **Reading calm:** 96px page tail on `.stage`/`.flow-page`; `--container-reading: 56rem`; move
  the briefing off `stage-wide` (`admin/src/stages/briefing.js:53`) — the single biggest
  calm-vs-dashboard win.
- **Signature callout:** `.prep-callout` → borderless accent-soft block in Bricolage 600
  (`admin/src/styles/design/one-page-run.css:98-108`).
- **Defect fixes:** define `--color-page` (un-hides Pulse bars/pills); `--session-topbar-h` to
  `:root` (6px content-under-bar bug); define phantom `--sero-emerald`/`--sero-rose` **to their
  exact current fallback hexes** (no visual change yet); remap `--color-amber`/`--color-warn` onto
  gold-800; `.tk-phase` radius; retokenize `.error-card`; tabular-nums on `.num`/`td.num`; fix
  wrong fallback hexes in `guided.css`/`guided.page.ts`.
- **The quick-wins bundle** (~15 one-liners — full list in plan §4 of
  [audit-findings.md](audit-findings.md)): guided flow's 13 sub-14px sizes → `--type-body-sm`;
  resting shadows off `.tg-card`/`.run-row`; `transition: all` → explicit lists; motion gated
  behind reduced-motion; chip text-safety colour fixes; focus one-offs → `--sero-shadow-focus`.

## Not in this phase
- Dark mode (Phase 2). Label tiers (Phase 3). Chip consolidation (Phase 4). The frame (Phase 5).

## Done when
- [ ] `npm test` + `npm run typecheck` green (baseline recorded first).
- [ ] Seen on the running app: titles calmer on both apps' main screens, briefing in the reading
      column, Pulse bars visible, no content under the top bar.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Calmer titles** — open any admin page and the customer Team page. Titles should feel
   noticeably calmer (smaller, less heavy), and multi-line titles wrap evenly instead of leaving
   one lonely word. ❌ Not OK if anything looks *bigger*/bolder or overlaps.
2. **Book-like briefing** — open a briefing. It reads in a narrower column with breathing room at
   the bottom; the manager's opening line sits in the warm display face inside a soft blue block
   with no border.
3. **Pulse bars visible** — open Pulse → "Where runs break off". The bars now have a visible
   track behind them (they were invisible before).
4. **No tuck-under** — start a run. Content no longer slides under the fixed top bar by a few
   pixels.
5. **Nothing else moved** — flick through 3 screens you know well. Same layouts, same features;
   only calmer.
