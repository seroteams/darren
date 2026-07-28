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
| 1 | Un-quiet the rail | Manager rows always visible; quiet-rail tests retired | ✅ |
| 2 | The three empty states | Team / Past 1:1s / Members match the approved mock | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**PLAN COMPLETE 2026-07-28.** Phase 1 green-lit (commit 2ac61fc6), Phase 2 green-lit (commit d14d6d76). Both closed **unwalked**: Carl signed off on the evidence in chat rather than a click-walk. Phase 1 has a screenshot; Phase 2 does not (see its file). Nothing here is pushed live yet, so sero.team still shows the quiet rail until the next "go live".

Baseline before Phase 1: `npm test` 198/199 (one pre-existing fail, `admin/src/stages/questioning-ready.test.ts`), typecheck clean.
After Phase 1: `npm test` 198/200, typecheck clean, `lint:copy` clean. The two fails are the same pre-existing one plus `frontend/src/stages/person-detail.test.ts`, which belongs to another session's in-flight demo-member work. Every app-nav and first-visit test passes.

Verified on screen, not from code: registered a brand-new zero-run manager (`emptystate.qa@seroteams.com`) on a local API and walked it at localhost:3455. The full rail renders (Home, Start 1:1, Team, Past 1:1s, Members, What is Sero?, Send feedback, Log out) and Home still opens on its first-run welcome. Proof: [phase-1-proof.png](phase-1-proof.png).

Not verified: mobile drawer at that width, and the member rail (unchanged by the edit, no reason to expect drift).

## Parked
- Richer previews (ghost table rows, sample brief) inside the empty states — Carl asked for simple; revisit only if the simple version feels thin.
- Any change to the member's one-row rail — members are untouched by this plan.

## Open question for Carl (found while verifying Phase 2)
A brand-new manager does **not** actually reach two of these three empty states, because signup
already seeds content:
- **Team** shows the example person (Sofia), so it is never empty on day one.
- **Past 1:1s** shows her example 1:1, so it is never empty either. (Home still shows its
  first-run welcome, because the example run is excluded from `hasRealRuns`.)
- **Members** always contains you, so it is never empty at all.

The copy is right and the states render correctly when the data IS empty (a manager who removes
the example, or any older account). But Phase 2 does not change what a new signup sees. Worth
deciding whether that is fine, or whether the seeded-example screens want their own first-run
treatment. Not actioned; raised for Carl.
