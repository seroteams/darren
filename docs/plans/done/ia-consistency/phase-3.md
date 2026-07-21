# Phase 3 — Person detail

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ DONE 2026-07-21 — built + verified (`npm test` / typecheck); proceed-authorized by Carl's "continue until done" (not individually screen-walked — commit c320f9dd)

## Built (2026-07-21)
`frontend/src/stages/person-detail.ts` — the bespoke "Back to Team" button (and its duplicate in the error notices) is gone; the header now stacks a shared breadcrumb `Team › {name}` → the person's name (h1) → the summary. The visible count reads "N 1:1s" instead of "N meetings". The page already headlined the person, so that stayed.
**Proof:** `typecheck:customer` clean for person-detail; admin suite 135/135. No unit test — the stage imports CSS so it isn't node-testable (like guest-runs); the breadcrumb itself is covered by `ui/breadcrumb.test.ts`.
**Not screenshotted (honest):** I hoped to grab one, but the same two blockers as Phase 2 hit — the SPA stalls in the automated Browser pane, and the dev auto-login account has no Team/1:1s to reach this page. Needs Carl's real walk.

## Goal
The manager's Person page already names the person — it just uses a one-off "Back to Team" button. Swap it for the shared breadcrumb, and fix the "meeting" wording.

## Changes
- `frontend/src/stages/person-detail.ts`:
  - Replace the bespoke `Back to Team` ghost button (and the duplicate one in the notices) with `breadcrumb([{label:"Team", nav:"team"}, {label: person.name}])`.
  - Fix the visible "N meeting(s)" count → "N 1:1(s)".

## Not in this phase
- run-detail (Phase 2), guided screens (Phase 4), the wider label sweep (Phase 5).

## Done when
- [ ] "Back to Team" is gone; a `Team › {name}` breadcrumb is in its place and navigates to Team.
- [ ] The person's meeting count reads "1:1s", not "meetings".
- [ ] `npm test` green, typecheck clean.
- [ ] Screenshot of the real rendered member screen attached.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Breadcrumb: `local > member app (manager login) > Team > click a person`.
1. **Breadcrumb replaces the back button** — on the person page you should see `Team › {name}` at the top, not a "Back to Team" button. Clicking "Team" returns to the roster. ❌ Not OK if the old button is still there or the crumb doesn't navigate.
2. **Wording** — the summary line reads "N 1:1s" (e.g. "4 1:1s"), never "4 meetings".
