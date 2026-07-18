# Phase 1 — Token foundation

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-18 — Carl authorised a continuous run through all phases ("keep going"). Verified invisible: both new tokens resolve in-browser, dashboard renders, console clean.

## Built (2026-07-18)
`admin/src/styles/design/tokens.css` — 3 additive lines: `--type-body-md: 15px`, `--color-surface-hover: var(--sero-soft-100)`, and corrected the stale `/* #ffffff */` comment on `--color-surface` to `#fdfefe`. No consumer touched. Verified live (tab 3093): `--type-body-md`→15px, `--color-surface-hover`→#fefefe, `--color-surface`→#fdfefe, no console errors, Pulse dashboard renders intact. Baseline pre-edit: typecheck clean, 157/157 tests.

## Goal
Land the tokens the rest of the sweep needs, so every later phase has a real token to point at — with zero visible change.

## Changes
- `admin/src/styles/design/tokens.css` only:
  - Add `--type-body-md: 15px` (the type scale currently jumps 14px → 16px, leaving inline 15px homeless — it appears 16× in guided.css alone).
  - Add `--color-surface-hover: var(--sero-soft-100)` (team-card.css already references it but it was never defined — only rendered via fallback).
  - Fix the stale `/* #ffffff */` comment on `--color-surface` (line ~276) — it actually resolves to `#fdfefe` (the never-pure-white rule). Comment only, no value change.

## Not in this phase
- Any consumer edits (screens keep working exactly as now).
- `--sero-space-11: 44px` — parked unless a 44px literal actually surfaces later.

## Done when
- [ ] `npm run typecheck` clean, `npm test` green (baseline captured first).
- [ ] Both new tokens resolve in the browser (DevTools computed styles), app boots with no console errors.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Nothing moved** — `local > admin (email+pass) > /runs`, then open a monthly check-in and the Team screen. Everything looks *exactly* as before. ❌ Not OK if any colour, size or spacing shifts — this phase must be invisible.
2. **App still boots** — open the browser console on load. You should see no new errors. ❌ Not OK if anything red appears.
