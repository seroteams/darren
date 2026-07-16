# Phase 3 — One chip, one button, one motif

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Collapse ~15 pill families, 3 segmented controls and 2 dropdown builds into one detail language,
and land the artifact's signature dot-meter — meaning by motif, not fifteen local inventions.

## Changes
- **One `.chip` primitive** (999px, 14px/500, tint-triad variants) in a new `design/pills.css`;
  refit `um-badge`, `pd-pill`, `lp-pill`, `el-pill`, `fb-*`, `arc-chip`, `mcr-chip`…;
  `.chip--dot` leading-dot status motif; fix all non-text-safe chip colours.
- **The confidence dot-meter** `.conf` chip (3 × 6px currentColor dots) wired into all briefing
  layouts + admin briefing (`frontend/src/stages/preparation-brief.ts`, `admin/src/stages/briefing.js`).
- **`.btn` retune:** 15px/600, 10×16 padding, colour-only hover (no lift); `.btn--sm` moved home;
  `.btn--quiet` added; the `--md` fork deleted; disabled-hover scoped off.
- **One-blue-action restored:** selected intake chips → tinted; verdict tags → soft triads;
  timeline numbers → accent-soft numbered medallions.
- **One `.seg` segmented control** (artifact recipe) refitting the 3 builds; dropdowns merged onto
  `.row-menu`; checkbox promoted to primitives; shared `ratingChip()`.

## Not in this phase
- The frame (Phase 4). Off-barrel CSS + alerts (Phase 5).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Seen on the running app: briefing, Pulse, Registered, Error log, Feedback, intake.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Dot-meter** — open a prep briefing. "How sure is this" is a small blue pill with three dots
   (2 of 3 lit = medium), not a bare sentence.
2. **One chip family** — walk Pulse, Registered, Error log, Feedback. Every status pill is the
   same shape/size family, with a tiny coloured dot signalling state.
3. **Buttons behave** — hover any button anywhere: colour changes, nothing jumps or grows a
   shadow. Still exactly one solid-blue action per screen (intake's selected chips no longer
   compete).
