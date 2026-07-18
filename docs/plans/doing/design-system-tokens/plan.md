# Design-system token sweep

**Goal:** Every user-facing colour, size, radius, shadow and z-index in both apps comes from a token — no raw hex, no off-grid values, no stale fallbacks — and a free lint guard stops drift returning.
**Driver:** Carl
**Created:** 2026-07-18
**Mockup:** none — token refactor, no new visual surface. Target is pixel-identical; the few deliberate nudges (control radius 8px→4px, error red #a3372c→#ac1608, one sub-14px caret) are called out per phase and verified by screenshot at that phase.

## Done means
- No raw hex or rgba colour literals in screen/CSS files outside `tokens.css` (bar the DESIGN §6 exempt list).
- No `var(--token, #fallback)` where the fallback disagrees with the real token (the "stale fallback" latent bug).
- Every control rounds at 4px, cards at 12px; spacing lands on the 4/8px grid; z-index uses `--sero-z-*`.
- No user-facing text below the 14px floor (fixes the one real breach: gallery.js 11/12px caret).
- `npm run lint:tokens` exists, is free, exits 0 on the clean tree, and fails on new drift.

## Resolved before we start (from the audit sweep, 2026-07-18)
- **System is already mature (~90% tokenised).** This is disciplined remapping, not a rebuild. Most swaps are pixel-identical (the literal already equals the token).
- **Drift concentrates in the member app** — `frontend/src/stages/guided/guided.css` (a verbatim prototype port) + `member-home.js`'s inline form. Admin is a thin scatter.
- **Only ONE new token is genuinely needed:** a 15px type step (`--type-body-md`). Everything else already has a token home. (`--color-surface-hover` is referenced by team-card.css but never defined — added in phase 1 too. `--sero-space-11: 44px` held unless a 44px literal actually surfaces.)
- **Exempt (DESIGN §6, do not touch):** `ui/dev-badge.js`, `ui/build-stamp.js`, `stages/design.js`, `universe.*`, the brandmark LOGO SVG in `app-nav.js` / `session-topbar.js` (both apps).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Token foundation | `--type-body-md:15px` + `--color-surface-hover` + fix stale surface comment | ✅ |
| 2 | Member runner (guided.css) | Detox the single biggest offender — 46 stale fallbacks, type/spacing/shadow/z/radius | ✅ |
| 3 | Member forms + team card | `member-home.js` inline form → classes; error colour + radius fixes; team-card.css | ✅ |
| 4 | Admin CSS pocket | Stray hex, off-palette rgba retints, 14 stale fallbacks, literal radii/z, side-stripe | ⬜ |
| 5 | Admin JS + a11y floor | Fix 11/12px caret (Lucide chevron), mismatched fallbacks, off-scale radii/type | ⬜ |
| 6 | Lint guard | `scripts/lint-design-tokens.js` + `npm run lint:tokens` (free) with exempt allowlist | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder set up, awaiting Carl's confirmation to start **Phase 1**. Nothing built yet. Baseline to be captured at the top of phase 1 (free checks: `npm test` + `npm run typecheck`).
**Board:** [board.html](board.html) (regenerates at each phase-close).
**Baseline (P1, 2026-07-18):** `npm run typecheck` clean · `npm test` 157/157 pass — captured before any edit.

## Parked
- `--sero-space-11: 44px` — only add if a real 44px literal surfaces during the sweep.
- LOGO SVG duplicated verbatim across `app-nav.js` and `session-topbar.js` — could be one shared constant. Not drift; a tidy-up for another day.
- `--sero-radius-md: 8px` exists but DESIGN sanctions no 8px radius anywhere (only 4px controls / 12px cards) — leaving the token, but the guard flags 8px on controls.
- Bespoke decorative signatures (orb periwinkle gradient, motion aura) — retint to Sero-family in phase 4, but they're intentional art, low priority.
