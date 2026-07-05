# Phase 3 — Tasks board reality check

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built — awaiting Carl's walk

> **Re-aimed 2026-07-05.** The original spec here checked the *build-phases board*
> that used to live on /tasks. Carl had that board removed the same day (it was all
> ✅), so /tasks is now just the **planner (kanban)**. This phase is re-pointed at the
> planner: an **Update from docs** button that reads the unfinished plan folders and
> keeps a set of auto-managed **"Docs" cards** in sync. Carl's pick: option **A** —
> Update only ever touches its own Docs cards; hand-added cards are never moved.

## Goal
The planner can fill itself from reality: an **Update from docs** button reads
`docs/todo/` live, lists every folder it checks, then animates adding / updating /
moving / removing a set of auto-managed **"Docs"** cards to match. It only ever
touches those Docs cards — your own cards are untouched.

## Changes (built)
- **Heartbeat endpoint** grows a `todos` view (`backend/api/services/heartbeat/`):
  for each active plan folder under `docs/todo/` (not in `done/`) it returns the
  title, phases done / in-progress / total (parsed from the PLAN.md status table),
  and the "Current state" paragraph; plus the list of `done/` slugs. +5 unit tests.
- **`admin/src/stages/tasks.js`** — an **Update from docs** button. On click: an
  overlay lists each folder it checks and ticks them off, then reconciles the Docs
  cards — slide-in for a new/active plan, pulse for one whose status moved, fade-out
  to **Done** for a plan now in `done/`, remove for one that's gone. Ends with a
  plain-words "since your last check: added / updated / moved / removed" summary.
- Column from phase tally: any progress → **Doing**, else **To do**; all phases ✅
  but folder still active → flagged "ready to close out".

## Not in this phase
- Touching hand-added cards, or any board status the user set
- Git-commit history / mapping commits to cards (the `todos` folder view was enough;
  commits parked)

## Done when
- [x] `npm test` green (heartbeat 13/13) · both typechecks clean
- [ ] Product owner has walked the scenarios below and said go

## Test scenarios — for the product owner
> ⚠️ Needs the local API (:3001) running **on this new backend code** — the shared
> dev API was on older code during the build, so restart it first (or open a fresh
> `npm run dev`). Without the new API the button shows a plain "couldn't reach the
> server" note and changes nothing.
1. **First update** — open /tasks, click **Update from docs**. You should see it list
   each `docs/todo/…` folder, tick them off, then slide in one **Docs** card per
   unfinished plan (≈12), with "N/M phases done" + its current-state note.
2. **Your own cards untouched** — your hand-added cards don't move or change; only
   the "Docs"-lane cards appear/update.
3. **It sees status move** — I mark a phase done in a PLAN.md, click again: that
   plan's Docs card pulses and its "N/M phases done" ticks up. ❌ Not OK if unchanged.
4. **It closes one out** — move a plan folder to `docs/todo/done/`, click again: its
   Docs card fades over to **Done**. A plan folder deleted entirely → its card is
   removed. The summary names what changed.
