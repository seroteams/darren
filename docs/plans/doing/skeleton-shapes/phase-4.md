# Phase 4 — The run lane and forms

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every wait inside a 1:1 run previews what that step is generating, and the two form screens stop popping.

## Changes
- Widen `admin/src/ui/flow-interstitial.ts` to take a skeleton spec instead of a fixed `createSkeleton(3)`.
- Wire `/bank`, `/evaluate`, `/focus`, `/prepare`, `/interview` (between turns), `/compare`, `/lexicon` so each ghost mirrors its own output.
- Give `/new` (intake) a form ghost. It has no loading state at all today: four calls fire after paint and the roster and meeting-type list pop in.
- Retire `checkingHtml()` in `frontend/src/stages/join.js` in favour of the shared preset.

## Not in this phase
The gallery proof sheet and the DESIGN.md rule.

## Done when
- [ ] A full run walk never shows a generic grey card
- [ ] `/new` no longer pops its roster in after paint
- [ ] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > Start 1:1, all the way to the briefing`
1. **Each wait looks like what's coming.** Walk a whole 1:1. At every waiting screen the ghost should hint at that screen's shape, not the same grey cards everywhere. ❌ Not OK if two different waits look identical.
2. **Starting a 1:1 is settled.** Click Start 1:1. The name field and the person picker should arrive together. ❌ Not OK if the picker or the meeting-type list appears a moment later.
