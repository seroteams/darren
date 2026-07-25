# Phase 3 — The refresh dead end

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A manager can refresh, bookmark, share or Back-button their way to a past 1:1 without losing it.

## Changes
- **Boot honours `/runs/:id` for a manager** — `frontend/src/main.js` boot, and the same branch in `admin/src/main.js`. The router already parses the path correctly and returns `RUN_DETAIL` with `myRunId`; boot has no branch that acts on it for a manager, so it falls through to the runs list and rewrites the URL. Add the manager branch, mirroring how `/team/:person` is already honoured.
- **Back and forward too** — the `startPopstate` handler must load the run, not just set the stage. Today Back restores the URL but leaves the empty "NO 1:1 SELECTED" card, which is the same bug seen from the other direction.
- **Honest failure** — if the id genuinely is not the caller's run, say so ("we could not find that 1:1") rather than showing the empty pick-one card. The empty card is correct only when there is no id in the URL at all.

## Not in this phase
- Members opening a run. `RUN_DETAIL` is deliberately not in `MEMBER_ONLY` (design audit A6): the runs API is owner-fenced, so a member could never load one. That stays as it is.
- The run detail screen's own contents. The duplicated meeting type in its header is in the Phase 7 sweep.

## Done when
- [ ] A test drives it end to end: open a run from the list, reload the URL, assert the person's name is on screen
- [ ] Same test asserts Back from the reloaded page lands on a working run detail, not the empty card
- [ ] A URL with a made-up run id shows the "could not find that 1:1" message, not the pick-one card
- [ ] Both apps behave the same (the customer app is the one Carl uses; the admin app mirrors it)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Refresh keeps the 1:1** — `local > customer (audit.manager) > Past 1:1s`, click "Grace Okafor", then press refresh. You should still be looking at Grace's 1:1. ❌ Not OK if you get "NO 1:1 SELECTED".
2. **Back works** — from that same page, press the browser Back button, then Forward. Both should land somewhere real. ❌ Not OK if the address changes but the page stays empty.
3. **The link is shareable** — copy the address bar from an open 1:1, open a new tab, paste it. It should open that 1:1.
4. **A bad link says so** — change the last part of the address to `nonsense` and load it. You should get a short "we could not find that 1:1". ❌ Not OK if you get the blank pick-one card with no explanation.
5. **The list still works** — go to Past 1:1s with no id in the address. The list should look exactly as it does today.
