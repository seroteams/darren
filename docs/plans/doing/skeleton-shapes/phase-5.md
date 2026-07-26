# Phase 5 — The proof and the rule

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Carl can judge all ~40 skeletons in one pass, and the rule is written down so this can't drift back.

## Changes
- Add a `--skeletons` flag to `scripts/gallery-export.mjs`. It already drives the real app with Playwright and stubs `**/api/**`; make GET handlers hang instead of fulfilling, wait past the anti-flash, capture.
- Emit a side-by-side sheet under `docs/screen-gallery/`: loaded page next to its skeleton, one row per route.
- Add the rule to DESIGN.md: a screen's loading state is a preset, never bespoke markup. Add the matching check to `.claude/skills/clean-up`.

## Known snags
- The exporter's freeze CSS sets `animation: none !important`. Verify the skeleton still paints at full opacity rather than assuming.
- Playwright is not in `package.json` devDependencies, so this phase needs `npx playwright install` first.
- DESIGN.md is claimed by chat `3a8bfd02`. Needs that lane clear.

## Done when
- [ ] The sheet covers every route, ghost beside loaded
- [ ] DESIGN.md and the clean-up skill both name the rule
- [ ] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > open docs/screen-gallery/ in a browser`
1. **One pass, all of them.** Scroll the sheet. For each screen the ghost on the left should be recognisably the page on the right. ❌ Not OK if any ghost is generic grey cards or the wrong shape.
2. **Nothing missing.** Every screen in the app should have a row. ❌ Not OK if a screen you use is absent.
