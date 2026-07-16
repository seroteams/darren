# Phase 1 — The return path

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit

## ✅ GREEN-LIT 2026-07-17
Carl walked all six scenarios live on localhost:3000 as manager and gave the go. Committed on `main` (`6346f891`). X8 deviation accepted: placement rule only, full run-list component extraction stays parked.

## Built (2026-07-15)
Branch `work/ux-audit-fixes`. Offline proof: **all tests green (2 new suites: finish-destination 3/3, stale-run-recovery 4/4), `npm run typecheck` clean, both apps `vite build` clean.** No paid runs (UI/copy only).

- **M1 — prep above history** — [person-detail.ts](../../../frontend/src/stages/person-detail.ts) render order `sinceBlock + list + prep` → `sinceBlock + prep + list` (prep moved above the Past-1:1s list).
- **M2 — persistent start on Past 1:1s** — [runs.ts](../../../admin/src/stages/runs.ts) adds a `Start a 1:1` bar above the populated list (manager path), not only inside the empty state.
- **M3 + X7 — resume self-heals** — [start-core.js](../../../admin/src/stages/start-core.js) `resume()` no longer fires a native `alert()`; on failure the row heals in place with a styled card + `Start fresh with <name>` (person name remembered when the row was expanded). New tested render helper [stale-run-recovery.ts](../../../admin/src/ui/stale-run-recovery.ts).
- **X5 — finish lands on the person** — [briefing.js](../../../admin/src/stages/briefing.js) routes to the person's page after Finish when the run carries a `personId` (captured before `resetSession()`), else Home. New tested decision helper [finish-destination.ts](../../../admin/src/stages/finish-destination.ts).
- **Prep skips re-identifying a known person (QA follow-up, folded in 2026-07-15)** — pressing "Prep 1:1" from Team or a person page no longer re-asks who they are; a roster person (personId + name held) opens intake at `MEETING_TYPE`, carrying role + seniority from the roster. Free-text / new names still start at `NAME`. New tested helper [intake-start.ts](../../../admin/src/ui/intake-start.ts) (3/3); wired in [team.ts](../../../frontend/src/stages/team.ts) + [person-detail.ts](../../../frontend/src/stages/person-detail.ts). *(Carl surfaced this walking Phase 1; chose to fold it in.)*
- Feature CSS isolated in [ux-audit-fixes.css](../../../admin/src/styles/ux-audit-fixes.css) (own file, no re-skin).
- **X8 deviation (flagged):** the *placement rule* ("primary action above the list, always") is implemented on both surfaces, but the **full shared run-list component was NOT extracted** — Home's accordion, Past-1:1s rows, and person-page rows are genuinely different shapes, and forcing one component now is high-risk/invisible-to-QA. Recommend it stays in the plan's parked "full component-extraction pass." Engineer's call, per simplicity-first; Carl to confirm.

## Goal
A returning manager can always see and press "prep the next 1:1" without scrolling, and nothing they click can dead-end.

## Changes
- **One shared run-list component** (new, `frontend/src/ui/run-list.ts` or nearest sensible home): one row shape (name, meta line, action slot), one placement rule — *the primary action renders above the list, always*. Home, person page, and Past 1:1s all use it. (M2, X8, Frog's #1)
- **Person page order** ([person-detail.ts:214](../../..//frontend/src/stages/person-detail.ts)): "Prep your next 1:1 with X" moves above the "Past 1:1s" list, directly under the "Since last time" recap. (M1)
- **Past 1:1s gets a persistent start action** ([runs.ts](../../../admin/src/stages/runs.ts)): the "Start a 1:1" button lives in the header when the list is populated, not only inside the empty state. (M2/X9)
- **Resume self-heals** ([start-core.js](../../../admin/src/stages/start-core.js)): when resume fails, the stale row is removed (or marked unrecoverable) in place, with an inline "Start fresh with <name>" action — no browser alert(). The error state is a styled card, not a native dialog. (M3, X7)
- **Finish lands on the person** ([briefing.js](../../../admin/src/stages/briefing.js)): after the rating modal, route to that person's page — where the saved briefing and the new top-placed prep button both live — instead of generic Home. (X5) *Dependency note: only when the run carries a roster `personId` (old runs and some free-text intakes won't) — fallback stays Home. briefing.js currently has no person reference; plumb it from the session ctx set in intake.js:125.*

## Not in this phase
- Any copy rewrites beyond labels the new component needs (Phase 3).
- Member-side routing (Phase 2). Top-bar overflow (Phase 5).

## Done when
- [ ] On a person page with 2+ past 1:1s at 1280×800, the prep button's position is above the list (verify with a screenshot, not the code).
- [ ] Past 1:1s with runs shows a start action without scrolling.
- [ ] A resume failure produces the styled recovery row — confirmed by pointing the app at a deliberately stale session id.
- [ ] Finishing a run lands on the person's page.
- [ ] `npm test` + `npm run typecheck` clean; both apps render the three list surfaces from the shared component.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself (manager@seroteams.com on localhost:3000). Next phase waits for your green light.
1. **The button you complained about** — open Team → Priya's page. The blue "Prep your next 1:1" button should now sit ABOVE the Past 1:1s list, visible without scrolling. ❌ Not OK if you have to scroll to find it.
2. **Past 1:1s can start one now** — open Past 1:1s (it has runs). You should see a start action near the top. ❌ Not OK if the only way to start is the left nav.
3. **The dead Resume is gone** — on Home, expand Carl's old session and press Resume. You should see a calm in-place message with a "Start fresh with Carl" option — NOT a browser popup. ❌ Not OK if an alert box appears or the row still offers Resume afterwards.
4. **Finishing brings you back to the person** — resume/complete any run to the briefing and press Finish. After the rating popup you should land on that person's page, briefing in their history. ❌ Not OK if you land on the generic Home.
5. **Nothing else moved** — Home still shows start-above-list; phone width (narrow window) still has no sideways scroll.
6. **Prep doesn't re-ask who they are** — on Team (or a person's page), press **Prep 1:1** for someone already listed (e.g. Priya). You should land straight on **"what type of meeting?"**, then "what does Sero need to know" — NOT the "who are you prepping for?" step. ❌ Not OK if it asks you to pick/confirm her name again. (Adding a brand-new name via "Add someone" → Prep should still start at the name step.)
