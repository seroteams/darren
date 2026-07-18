# Phase 4 — Admin CSS pocket

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Clear the thin scatter of drift across `admin/src/styles/` — mostly pixel-identical token swaps plus a few off-palette retints.

## Changes
- **Stray raw hex** → tokens: session-topbar (`#5aa9e6`/`#fff`/`#24445c`), axes (`#eef1f6`), design-stage/mobile/stage-extras/test-engine (`#fff`).
- **Off-palette rgba retints** → Sero families: app-nav dark rail whites, motion aura (`#5b3df5`/`#2f6bff`), one-page-run (`#d2435a`), briefing mint, base hero glow. *These are the deliberate on-brand nudges — colours that aren't Sero today become Sero.*
- **14 stale `var()` fallbacks** corrected/dropped: `#c0392b`→`#ac1608`, gold-700 `#ad7400`→`#ffc247`, ink `#303030`→`#1f2a37`, radius-sm `6`→`4`, z-popover `1000`→`60`, body-sm `15`→`14`.
- **Literal radii / z-index / spacing** that already equal a token → the token.
- **2 raw drop-shadows** → `--sero-shadow-lg` / `--shadow-lift`.
- **stage-review.css:235 side-stripe** (DESIGN §6 rule 10 bans side-stripe borders) → a tint/card treatment.

## Not in this phase
- Admin JS/TS (phase 5). `tokens.css` itself (phase 1). Exempt files.

## Done when
- [ ] `npm run typecheck` clean, `npm test` green.
- [ ] Screenshots of a live session (topbar, orb, axis bars, review stage), Pulse, admin tables and mobile width confirm on-brand rendering.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Live session** — `local > admin (email+pass) > run a session`. Watch the top bar, the thinking orb, the axis score bars and the review stage. All read as before; the review stage's left accent stripe is now a softer tint treatment. ❌ Not OK if anything looks broken or off-brand.
2. **Pulse + tables** — open the Pulse dashboard and the admin tables. Star ratings (were a wrong gold fallback) show the correct Sero gold. ❌ Not OK if stars, deltas or tints look off.
3. **Mobile width** — resize to phone width. Nav rail, cards and spacing hold. ❌ Not OK if anything overlaps or mis-rounds.
