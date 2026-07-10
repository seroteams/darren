# Phase 2 — Health signals (stuck sessions · QA verdict · star rating)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The map shouts only about problems: a stalled live session goes still and red, a QA-flagged run wears a warning ring, and member star ratings finally show up.

**Honesty note:** per-run safety-gate outcomes don't exist anywhere (golden-checks is the offline regression suite), so this phase deliberately does NOT show "gate" signals — only the QA review verdict, star rating, and session staleness, all of which are real recorded data.

## Changes
- **2a Stuck sessions (frontend only):** `SESSION_STUCK_AFTER_MS` (30 min) + pure `sessionStalledMinutes(lastSeenAt, now)`; `describeNode` gains a `now` param; stalled session panel row "Health · Stalled — nothing has happened for N minutes" (hours wording ≥90 min); `HEALTH_COLOR` map beside `COLOR`. Renderer: stalled comet's ring goes steady + warn-red instead of pulsing gold (stillness = stuck; color not motion, so reduced-motion safe); counts line gains "(1 stalled)".
- **2b QA verdict (frontend only, fields already on the feed):** run nodes carry `reviewStatus`/`reviewOverall`/`reviewFailed`; pure `reviewWords()` → "Looked good" / "Needs fixes — 2 areas flagged" / "Blocked — …" / "Partly reviewed" / null; panel row "QA check · …"; thin steady ring on run moons — caution-gold for "fix", warn-red for "block", nothing for keep/unreviewed.
- **2c Revive star ratings (the one backend change):** `toFinishedRow` (backend/db/runs-store.ts) adds `rating: ratingFromValue(r.rating)?.stars ?? null`; mirror in `listFinishedRuns` (backend/engine/run-history.ts) with `ratingOf(dir)?.stars ?? null`. Bare stars number only — the manager's private note never ships. Seed the pg-parity test's run with a rating so parity exercises the field. (Aside: `clonable` in runs.service.ts reuses `listFinished`, so the dev prefill picker also carries the number — harmless, admin-gated.) The Universe's existing rating read + "Rating · ★★★★☆" row then work unchanged; add a model test proving it end-to-end.

## Not in this phase
- Cost (Phase 3). Safety-gate outcomes (don't exist — see honesty note). New legend chips. Stars in the person panel run list (parked).

## Done when
- [ ] Backend + admin `npm test` (incl. pg-parity) and `npm run typecheck` green.
- [ ] Stalled ring, QA rings, and a real star rating all seen in the browser.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **Stalled comet** — start a prep and abandon it mid-Interview. After ~30 min the comet's ring stops pulsing and turns red-tinted; the bottom-left counts read "(1 stalled)"; its panel says "Health · Stalled — nothing has happened for N minutes". ❌ Not OK if it keeps pulsing gold.
2. **Fresh session stays calm** — a session touched in the last half hour keeps the normal pulsing gold ring and shows no Health row.
3. **QA verdict rings** — in the Library, mark one run "fix" with 2 failed areas and another "block". In the Universe: amber ring + "QA check · Needs fixes — 2 areas flagged" on the first, red ring + "Blocked — …" on the second. A "keep" run wears no ring.
4. **Stars come alive** — rate a run 4 stars from the member side, press Update in the Universe: that run's panel shows "Rating · ★★★★☆". ❌ Not OK if the note text appears anywhere.
5. **Reduced motion** — with OS reduced-motion on, a stalled session is still obviously different (by color, not movement).
