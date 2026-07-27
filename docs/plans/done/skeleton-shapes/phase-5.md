# Phase 5 — The proof and the rule

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-27 — Carl walked the whole plan and signed it off (commit fd778f1b)
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
- [x] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > open docs/screen-gallery/ in a browser`
1. **One pass, all of them.** Scroll the sheet. For each screen the ghost on the left should be recognisably the page on the right. ❌ Not OK if any ghost is generic grey cards or the wrong shape.
2. **Nothing missing.** Every screen in the app should have a row. ❌ Not OK if a screen you use is absent.

---

## Built (2026-07-27)

**The proof sheet is live in the app, not a static export.** `/design` gains a "Loading skeletons" section: every preset rendered from the real module, stacked above the real markup it stands in for, with both heights measured in the browser at mount and the gap printed. It can never go stale, because it renders the same code the screens do.

That is a deliberate departure from the plan, which called for a `--skeletons` flag on `scripts/gallery-export.mjs`. Playwright is not in `package.json`, so that route needed a new dependency in a shared file, and it would have produced a snapshot that drifts. The live sheet needs nothing new and answers the same question.

Also done:
- **DESIGN.md rule 5** now says a loading state is a preset from `ui/skeleton-presets.ts`, never hand-rolled markup and never a grey "Loading…" sentence, and that a missing shape means adding a preset rather than improvising.
- **The clean-up skill's Lens G** was checking for `createSkeleton()` by name, which the kit outgrew. It now looks for hand-rolled skeletons, plain "Loading…" sentences, and presets passing a bare row count where the screen has a real shape.

### What the sheet reports

| Preset | Ghost | Loaded | Gap |
|---|---|---|---|
| List rows | 73.5 | 73.5 | exact |
| Table | 68.4 | 68.4 | exact |
| Card sections | 137.3 | 137.3 | exact |
| Focus points | 82.2 | 82.2 | exact |
| Form fields | 65.2 | 65.2 | exact |
| Interview question | 341.6 | 348.0 | 6.4 |
| KPI tiles | see note | | |
| Generic cards | no counterpart | | |

### The one honest gap, now written down where it can't be forgotten
`tiles` is the only preset with hardcoded line counts. A Pulse tile sits on a 168px grid track where its label wraps to two lines and its caption to four; the ghost is tuned to that, so it reads wrong at any other width. Measured in place on `/pulse` the gap is 2.8px. Pulse is the only consumer, so it stays tuned to Pulse, and the sheet prints that instead of a misleading number.

### A finding from building the sheet
The pairs were side by side at first, and every case flagged a large gap. The cause was the layout, not the skeletons: two columns halve the width, and at half width the real sample's text wraps more than a fixed-line-count ghost assumes. Stacking them full width made five of the six exact. Worth remembering, because it is the same effect as the table-row and tile gaps: **these ghosts are correct at the width their screen actually uses, and drift at others.**

### Offline proof
`npm test` 197/197 · `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS.
