# Phase 1 — Return-visit glow (recency)

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10 — Carl walked the 5 scenarios (bright-vs-dim, panel line, old data, Update, nothing-else-changed) and said go (commit b4398f23)

## Built (2026-07-10)
- `admin/src/stages/universe.model.ts` — `RECENCY_HALF_LIFE_MS` (7 days), `recencyIntensity()`, person `lastActiveAt` (newest run timestamp, null when unknown), "Last 1:1" panel row.
- `admin/src/stages/universe.model.test.ts` — 3 new tests (written first, seen red, then green): intensity curve + edge cases, lastActiveAt derivation, panel row present/absent.
- `admin/src/stages/universe.ts` — frame loop reads `Date.now()` once per frame; person glow alpha 0.20–0.55 and dot alpha 0.55–0.95 scale with heat. Static brightness, visible floor, no new animation.
- Offline proof: `npm test` 114/114 (baseline was also 114/114), `npm run typecheck` clean.
- Browser proof: Universe rendered with real data (18 people, 25 finished 1:1s); Daniel's panel shows "Last 1:1 · 13d ago"; canvas capture shows person planets at clearly different brightness.
- Note for QA: in Claude's embedded preview pane the map needs a workaround to animate (the pane suspends animation frames — harness quirk, documented in memory). A normal browser tab is unaffected.

## Goal
Person planets burn bright when their manager ran a 1:1 recently and fade (never vanish) when dormant — the Gate-1 "are managers coming back" signal, readable at a glance.

## Changes
- `admin/src/stages/universe.model.ts` — new `RECENCY_HALF_LIFE_MS` constant (7 days) + pure `recencyIntensity(lastActiveAt, now)` → 0..1; person nodes gain `lastActiveAt` (newest of their runs' `lastSeenAt`); person panel gains a "Last 1:1" row.
- `admin/src/stages/universe.model.test.ts` — tests first (node:test) for all of the above.
- `admin/src/stages/universe.ts` — frame loop scales each person planet's glow and dot brightness by its recency heat. Static brightness, not animation; dormant planets keep a visible floor.

## Not in this phase
- Health signals (stalled sessions, QA rings, ratings) — Phase 2.
- Cost — Phase 3.
- No backend changes at all.

## Done when
- [ ] `npm test` and `npm run typecheck` green.
- [ ] In the running app, a person with a fresh 1:1 is visibly brighter than a long-dormant one (seen in the browser, not inferred from code).
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Bright vs dim** — open the Universe. A person whose last 1:1 was today/this week should clearly glow brighter than one quiet for 3+ weeks. ❌ Not OK if you have to squint or click to tell them apart.
2. **The panel says when** — click a bright planet. The panel should show "Finished 1:1s" and a "Last 1:1 · …" line in plain words (e.g. "3 days ago"). ❌ Not OK if it shows raw numbers or nothing.
3. **Old data doesn't break it** — click a dim planet (someone with only old runs). It renders, panel opens, no errors — the "Last 1:1" line may be missing only if the run has no timestamp at all.
4. **It updates live** — finish (or touch) a 1:1 for a quiet person, then press "Update from the engine". That planet should brighten on the rebuild.
5. **Nothing else changed** — spin, zoom, filter chips, search, reduced-motion all behave exactly as before.
