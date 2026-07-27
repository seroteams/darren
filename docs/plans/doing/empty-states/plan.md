# First-visit empty states

**Goal:** A brand-new manager sees the full left rail from day one; Team, Past 1:1s and Members each show a simple "this is what you'll see here" empty state instead of being hidden.
**Driver:** Carl
**Created:** 2026-07-27
**Mockup:** https://claude.ai/code/artifact/096c0197-52f8-447a-a705-417a72cd9404 — awaiting Carl's approval

## Done means
- A fresh manager account (zero 1:1s) sees Home · Start 1:1 · Team · Past 1:1s in the rail, plus Members at the foot — nothing hidden.
- Clicking Team, Past 1:1s or Members shows a simple empty state that says what the page will hold and how it fills up.
- Home keeps its current first-run welcome (the "Prep your first 1:1" hero) — unchanged.

## Resolved before we start
- The hiding is one gate: `frontend/src/ui/app-nav.js` line 267 (`quiet = mgr && isFirstVisit()`). Customer app only — the admin app's rail never quiets.
- All three pages ALREADY have basic empty states (Team "Your team starts here", Runs "No 1:1s yet", Members "No one has access yet"), so nothing crashes when the rows un-hide. Phase 2 upgrades the copy/look to the approved mock.
- `first-visit.ts` stays: Home's hero still uses it. Only the rail stops asking.
- `admin/src/stages/runs.ts` is shared with the admin app — its empty-state copy change shows in both apps (intended: live and local look the same).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Un-quiet the rail | Manager rows always visible; quiet-rail tests retired | ⬜ |
| 2 | The three empty states | Team / Past 1:1s / Members match the approved mock | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder set up 2026-07-27. Mockup + board shared; waiting on Carl's read of the mock and the phases before Phase 1 starts. Baseline to be run at Phase 1 start.

## Parked
- Richer previews (ghost table rows, sample brief) inside the empty states — Carl asked for simple; revisit only if the simple version feels thin.
- Any change to the member's one-row rail — members are untouched by this plan.
