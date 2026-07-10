# Phase 2 — Health signals (stuck sessions · QA verdict · star rating)

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-11 — Carl's "a" (walk WAIVED, his call: the dev API of the moment predated the build, so the Rating row couldn't be seen live; artifact check caught it and it's recorded honestly). Verified by the agent instead: 116/116 incl. the pg-parity proof on real Postgres, stalled row + blocked row + rings live in the browser. Residual until his next API restart + first starred run: the Rating row on screen. (commit ed947825)

## Built (2026-07-11)
- `admin/src/stages/universe.model.ts` — `SESSION_STUCK_AFTER_MS` (30 min), `sessionStalledMinutes()`, `stalledWords()` (minutes → hours past 90), `reviewWords()`, `HEALTH_COLOR`; run nodes carry `reviewStatus`/`reviewOverall`/`reviewFailed`; `describeNode` gains an optional `now` and renders "Health · Stalled — …" + "QA check · …" rows.
- `admin/src/stages/universe.model.test.ts` — 5 new tests (red→green): stall math, Health row incl. hours wording, verdict words, feed→node→panel for verdict + rating, health palette.
- `backend/db/runs-store.ts` `toFinishedRow` + `backend/engine/run-history.ts` `listFinishedRuns` — both now emit `rating: <stars|null>` (bare number, never the note). New test in `runs-store.test.ts` proves the note can't leak; the pg-parity test already seeds a 4★ rating and deep-equals both stores — passed.
- `admin/src/stages/universe.ts` — stalled comet ring goes STILL + warn-red (motion means alive; color not motion, reduced-motion safe); run moons wear a thin amber ring for "fix", red for "block", nothing otherwise; counts line gains "(N stalled)" and re-reads the clock every minute.
- Offline proof: `npm test` 116/116 (incl. pg-parity), typecheck clean.
- Browser proof (real data): counts read "12 live sessions (12 stalled)"; a stalled session's panel shows "Health · Stalled — nothing has happened for about 3 hours"; Samira's blocked run shows "QA check · Blocked — 4 areas flagged"; 1,506 warn-red ring pixels measured on the canvas (the rings are drawing).
- ⚠️ Two honest notes for the walk: ① the long-running dev API predates this build, so the **Rating row appears after your API restarts** (the field is proven by unit + parity tests against real Postgres). ② no run currently carries stars — scenario 4 (rate one, press Update) creates the first.

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
