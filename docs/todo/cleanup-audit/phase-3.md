# Phase 3 — Frontend helpers (one copy each)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The admin app has one HTML-escape helper and one relative-time helper, instead of four hand-rolled copies of each.

## Changes
- Replace the local escape functions in `compare.js`, `review-run.js`, `tasks.js`, `library.js` with the shared, tested `escapeHtml` from `admin/src/ui/html.js` (fixes the copy that forgets to escape quotes).
- Extract the `relTime()` function copy-pasted in `compare.js`, `runs.ts`, `person-detail.ts`, `team.ts` into a new `admin/src/ui/time.js` and import it in all four.

## Not in this phase
- Unifying the two date formatters (parked unless trivial while in there).
- Any visual changes.

## Done when
- [ ] `npm test` + both typechecks green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Pages with names and notes still render** — open Compare, the build board (Tasks), Library, and a run review. Text with quotes/apostrophes in names or notes should show normally. ❌ Not OK if you see raw `&quot;`-style codes or broken layout.
2. **"x min ago" times still show** — check Runs, Team, and a person page; the little relative times ("2h ago") should look the same as before.
3. **Free checks are green** — confirm my pasted results.
