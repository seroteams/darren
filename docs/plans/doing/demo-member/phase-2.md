# Phase 2 — Label + remove

**Part of:** [plan.md](plan.md) · **Status:** 🔨 BUILT 2026-07-28, awaiting Carl. Not walked by him yet.

## Goal
Everything demo is unmistakably labelled "Example" and can be cleared with one click.

## What it did

- **Team roster card** carries an "Example" chip beside the seeded person's name
  (`frontend/src/stages/team-card.ts`). The flag now travels: `buildRosterView`
  (`admin/src/ui/group-people.js`, shared by Team and person detail) passes `isDemo`
  through to the row. The people API already returned it, so no backend change.
- **Person detail** carries the same chip in the identity header, from the SAME
  `exampleChip()` helper. One chip, one flag, no second copy to drift.
- **"Remove example"** sits beside "Start 1:1" as a quiet ghost, on the example person
  only. It goes through the shared destructive confirm dialog, then the roster's existing
  hard delete (`DELETE /team/people/:id`), which already removes the person, their runs
  and the run artifacts in one transaction. No new endpoint was needed.
- A failed removal says so through the shared alert and **stays put** rather than
  navigating as if it worked.

**Home was already done** (home-screen-truth Phase 3, 2026-07-25) and was left alone.

**Off the plan, fixed anyway:** `admin/src/stages/questioning-ready.test.ts` (another
lane's file, from commit `1900bbb1`) threw ENOENT on Windows before running a single
assertion: it built its path with `new URL(import.meta.url).pathname`, which yields
`/C:/...` and joins into `C:\C:\...`. Switched to `fileURLToPath`, the helper every other
source-reading test here uses. The suite could not be reported green until this was fixed.

## Verified

- `npm test` **200/200**, `npm run typecheck`, `lint:copy`, `lint:tokens`,
  `lint:components` all green.
- **On a real fresh signup** (registered through the customer app at `localhost:3385`,
  real API, real DB), measured off the live DOM:
  - Team shows one row, "Sofia", with the chip `chip chip--plain` reading "Example",
    14px, neutral, pill radius, 8px clear of the role text.
  - Person detail header shows the same chip; the actions row holds
    `btn btn--ghost js-remove-example` ("Remove example") **beside** the blue
    "Start 1:1 with Sofia", so the blue stays on the primary action.
  - The confirm dialog opens with the danger-styled confirm and focus parked on Cancel;
    **Cancel changes nothing** (still on the person, chip intact).
  - Confirming lands back on Team with **zero rows** and the normal first-time empty
    state. The API then reports `people: 0`, `runs/mine: 0`, `runs/recent: 0`, and Home
    is back to the first-run welcome. No console errors.

## NOT verified

- **No screenshot.** The Browser pane would not composite frames this session, so
  everything above is measured off the live DOM rather than seen as a picture.
- **"Real data safe"** (add a real member, then remove the example) was not run. The
  delete is fenced to one personId and the seeded example is the only row it touches,
  but that scenario is untested end to end.
- The example run's **recap header** does not carry the chip. Opening the example 1:1
  itself still shows no label.

## Left out, and why

- **"See all past 1:1s"** (`admin/src/stages/runs.ts`) still shows the example
  unlabelled, and `pgListFinishedRunsForMember` / `toMemberRow` (`backend/db/runs-store.ts`)
  still do not carry `isDemo`. That file is inside lane `f4b03826` (first-visit empty
  states), so it was not edited. This is the one piece of the phase's scope that is not
  built.
- The **Team card ⋯ menu** entry for Remove example: the menu is wired in
  `frontend/src/stages/team.ts`, also inside lane `f4b03826`. Removal works from the
  person's own page instead, which is one click further but not blocked.

## Not in this phase
- Auto-hide when the first real member is added (parked).
- Any change to how real people/runs render.

## Test scenarios — for the product owner
`local > customer app > register a brand-new account > Team`
1. **Badges** — Team shows "Sofia" with an "Example" chip; clicking in shows it again in
   the header. ❌ Not OK if any demo surface is unlabelled.
2. **Remove** — on the example person, click "Remove example", confirm. You land back on
   Team, empty, with the example gone from Home too.
3. **Real data safe** — add a real member, then remove the example. The real member is
   untouched. (This one has not been run yet.)
