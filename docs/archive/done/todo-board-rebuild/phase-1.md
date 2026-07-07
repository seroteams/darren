# Phase 1 — New Tasks page + nav

**Part of:** [PLAN.md](plan.md) · **Status:** 🔨

## Goal
Stand up a brand-new **"Tasks"** page (its own nav item, its own `/tasks` address) that shows the build phases as a clean board: **one** status per step that I set (✅ Built / 🔵 Building / ⚪ Not started), kept clearly separate from **your** verdict tick, plus a warning if you're on the wrong web-address. The existing **Build plan** page is left completely untouched so you can still use it.

## Changes
- `admin/src/state.js` — add a new `TASKS` stage.
- `admin/src/ui/app-nav.js` — add a "Tasks" nav item (own icon, click handler, active-highlight).
- `admin/src/router.js` — add the `/tasks` address ↔ `TASKS` stage.
- `admin/src/main.js` — point the `TASKS` stage at the new page file.
- `admin/src/stages/tasks.js` — NEW page. Clean board with:
  - **My status** per step (from the build status in the data) as a read-only chip — ticking never changes it.
  - **Your verdict** as its own clearly-yours control ("✓ I've checked this"), saved under its OWN storage key (won't clash with the Build plan page's ticks).
  - A top banner that warns if the page is open anywhere other than `localhost:3000`.
  - One plain line explaining the two roles: "I mark what's built; you tick what you've checked."

## Not in this phase
- Touching the existing Build plan page (`checklist.js`) — leave it alone.
- Rewriting the "how to check" wording (Phase 2).
- The run-the-checks-for-you button (Phase 3).

## Done when
- [ ] A new "Tasks" nav item appears and opens a new page at `/tasks`; Build plan still works exactly as before.
- [ ] On the new page, my status chip and your verdict are two visibly separate things; ticking your box never changes my chip.
- [ ] Opening the new page on the wrong address shows a warning; on localhost:3000 it doesn't.
- [ ] `npm test` still 30/30.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these at **http://localhost:3000**. Next phase waits for your green light.
1. **New nav item** — in the left nav you should see a new **Tasks** item (alongside Build plan, which is still there). Click it → a new board opens at /tasks.
2. **Old page safe** — click **Build plan**. It should look and work exactly as before — nothing changed there.
3. **Two separate signals** — on the Tasks page, look at any step. You should see my status chip (e.g. "✅ Built") AND a separate "✓ I've checked this" control — clearly two different things.
4. **Your tick doesn't fake my status** — tick "I've checked this" on a step. My status chip stays exactly as it was. Untick it — still no change to my chip.
5. **Wrong-address warning** — open http://localhost:3002/tasks. You should see a ⚠️ banner telling you to switch to localhost:3000. ❌ Not OK if it just looks empty with no warning.
6. **Right address, clean** — open http://localhost:3000/tasks. No warning; your ticks here are saved and show up on reload.
