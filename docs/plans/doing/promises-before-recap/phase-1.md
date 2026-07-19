# Phase 1 — The moment

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-07-19)
`admin/src/ui/promise-agree.ts` + `.test.ts` + `styles/design/promise-agree.css` (new), promise-confirm trio deleted, `design.css` import swapped, `briefing.js` view switch (gate: sessionId && !scripted && !skip && !confirmed — no store.user, guests included), wash now plays on the recap view, `state.js` initial gains promises/promisesConfirmed/promisesConfirmSkip/promisesSaveFailed (leak fixed, regression test in `state.test.ts`), `briefing-structure.test.ts` rewritten. Offline proof: typecheck clean, npm test 157/157. Real-module browser proof (Vite dev, actual briefing.js): unlocked → step with both groups; edit + move + lock → recap grouped band; skip → "Sero's suggestions" fallback; scripted → no step; locked-empty → section dropped.

## Goal
Finishing the questions lands on a dedicated full-screen Promises step — two owner groups, lock in or skip — before any recap is shown.

## Changes
- NEW `admin/src/ui/promise-agree.ts` + `.test.ts` — two-group step ("You promise" / "{Name} promises"), engine drafts seed the You group, rows move between groups, add per group, max 10 total, blue "Lock these in", ghost "Skip — straight to the recap". `draftsFromNextActions` migrates over from promise-confirm.
- NEW `admin/src/styles/design/promise-agree.css` (tokens-only); `design.css` swaps the import.
- DELETE `admin/src/ui/promise-confirm.ts` + `.test.ts` + `promise-confirm.css` (superseded).
- `admin/src/stages/briefing.js` — view picker ahead of the recap render: Promises view when `store.sessionId && !store.scripted && !store.promisesConfirmSkip && !store.promisesConfirmed`; lock/skip swaps to the Recap view; celebration wash moves to Recap-view entry; confirm-card branch + `hasLockAction` removed (Finish is the recap's blue action again).
- `admin/src/state.js` + `state.test.ts` — `promises: null, promisesConfirmed: false, promisesConfirmSkip: false` added to `initial` (fixes cross-run leak).
- `admin/src/stages/briefing-structure.test.ts` — assertions rewritten for the two-view shape.

## Not in this phase
- Snapshot/rehydrate plumbing, guest lane, recap grouped band (Phase 2).
- PDF changes (Phase 3). Gallery walk (Phase 4).

## Done when
- [ ] `npm test` + `npm run typecheck` + `npm run lint:tokens` clean.
- [ ] Screenshot of the real rendered Promises screen (Browser pane) matches the approved mockup.
- [ ] Scripted QA lane verified to skip the step entirely.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
`local > admin (email+pass) > run a 1:1 to the end of the questions`
1. **The moment appears** — answer the last question and choose "Agree next actions". You should see a full-screen "Lock in what you two agreed" page with two boxes: *You promise* and *{Name} promises* — not the recap. ❌ Not OK if you land straight on the recap.
2. **Move a promise** — tap the move arrow on a row. It should jump to the other box. ❌ Not OK if it duplicates or vanishes.
3. **Lock in** — press "Lock these in". The recap should open with its usual colour wash. ❌ Not OK if the old confirm card appears inside the recap.
4. **Skip path** — run again, choose "Skip — straight to the recap". You should go directly to the recap, no promises page.
