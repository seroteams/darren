# Phase 3 — The refresh dead end

**Part of:** [plan.md](plan.md) · **Status:** 🔨 BUILT 2026-07-28 (commit `69edbb24`), awaiting Carl. Not walked by him yet.

## Goal
A manager can refresh, bookmark, share or Back-button their way to a past 1:1 without losing it.

## What it did

- **Boot honours `/runs/:id`** in both apps (`frontend/src/main.js`, `admin/src/main.js`).
  The router always parsed the path correctly and returned `RUN_DETAIL` with `myRunId`;
  boot had no branch that acted on it for a manager, so it fell through to the generic
  standalone-path fallback, which sets the stage but drops the params. `run-detail.ts`
  then read an empty `store.myRunId` and painted "No 1:1 selected". The new branch mirrors
  the `/team/:person` handler directly above it, and sits BEFORE the generic fallback.
- **Back and forward** — `startPopstate`'s `RUN_DETAIL` branch now bumps `stageTick`.
  This was the second, hidden half of the bug: going Back from one run to *another*
  keeps `stage === RUN_DETAIL`, so the shell's render gate
  (`s.stage !== routedStage || s.stageTick !== routedTick` in `boot-shell.js`) saw
  nothing new and never re-mounted. The screen kept showing whichever run rendered last.
- **Honest failure** — a made-up id now reaches `run-detail.ts`, whose `getMyRun` catch
  already renders "Couldn't open this 1:1 / It may not be one of yours, or something went
  wrong." The blank pick-one card is now reached only when there is genuinely no id in the
  URL, which is the one case it is correct for.

**Only the admin/owner path was missing this.** The member branch in `admin/src/main.js`
already carried `myRunId`; that is why the bug looked intermittent.

## Verified

- `npm test` **202/202** (8 new tests, 4 per app), `npm run typecheck`, `lint:copy`,
  `lint:tokens`, `lint:components` all green.
- The new tests read `main.js` **source** rather than importing it: importing runs
  `boot()` and `startPopstate()` as a side effect, with real fetches and real DOM. Same
  approach as `auth-screens.test.ts` and `questioning-ready.test.ts`. They assert the
  branch exists, carries the id, sits before the generic fallback, falls back to the runs
  list, and bumps `stageTick` on popstate.

## NOT verified

- **Not walked in a browser, no screenshot.** The behaviour is proved by the source
  contract and the render-gate reasoning above, not by a live refresh. The local servers
  are up (`entry-api` :3381, `entry-customer` :3385) but this was not clicked through.
- Scenario 4 (a made-up id) relies on `run-detail.ts`'s existing catch, which was read but
  not re-run.

## Not in this phase
- Members opening a run. `RUN_DETAIL` is deliberately not in `MEMBER_ONLY` (design audit A6):
  the runs API is owner-fenced, so a member could never load one. That stays as it is.
- The run detail screen's own contents. The duplicated meeting type in its header is in the
  Phase 7 sweep.

## Done when
- [x] Boot carries the id for a manager's `/runs/:id`, in both apps
- [x] Back between two runs actually remounts (the `stageTick` half)
- [x] A made-up id gets a message, not the blank pick-one card
- [x] `npm test`, `typecheck`, `lint:copy`, `lint:tokens`, `lint:components` clean
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
`local > customer app (localhost:3385) > Past 1:1s`

1. **Refresh keeps the 1:1** — click into any past 1:1, then press refresh. You should
   still be looking at it. ❌ Not OK if you get "No 1:1 selected".
2. **Back works** — from there press Back, then Forward. Both land somewhere real.
   ❌ Not OK if the address changes but the page stays empty or shows the wrong 1:1.
3. **The link is shareable** — copy the address from an open 1:1, paste it in a new tab.
4. **A bad link says so** — change the last part of the address to `nonsense`. You should
   get "Couldn't open this 1:1", not a blank card.
5. **The list still works** — go to Past 1:1s with no id in the address; unchanged.
