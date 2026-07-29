# Phase 2 — End-of-meeting screens: lock-in + recap

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The lock-in and recap screens look finished: the Final read matches the runner's meters, nothing floats or sits empty, the QA button stays local, and the lock-in screen explains itself.

## Changes
- `admin/src/ui/promise-agree.ts` — header copy says this is where you two agree next steps in the meeting; the skip path says what skipping costs (skipped items are not brought back next time).
- `admin/src/ui/axes.js` + `admin/src/styles/design/axes.css` — Final read restyled to the runner's meter language (lavender track, gradient fill, numbered thumb chip). Same numbers, same absolute-score meaning; only the look changes.
- `admin/src/ui/recap-pdf.ts` — the PDF's Final read bars kept visually in step.
- `admin/src/stages/briefing.js` + `admin/src/styles/design/briefing.css` — top gap reduced; bullet mark sits beside its text (grid, like `.copyable-row`); empty bullets filtered; empty date pills no longer render (guards at the promise list, the suggestions list, and the PDF).
- `admin/src/stages/briefing.js` (~line 614) — "Copy QA prompt" additionally requires not-live (`isLiveEnv()` from `admin/src/state.ts`, read-only import).

## Not in this phase
- `admin/src/ui/stage-recap-sections.js` — same gaps, but another chat's lane owns it (parked in plan.md).
- No recap redesign — tidy pass only (Carl's call). Judge the design fresh once clean.

## Done when
- [ ] Approved mockup matched on the real screen (screenshot in chat).
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy`, `npm run lint:tokens` clean.
- [ ] PDF export eyeballed — Final read in step, no empty date gutter.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Lock-in reads clearly** — `local > npm run dev > localhost:3001 > finish a 1:1`. On "Lock in what you two agreed": the copy tells you this is agreed together in the meeting, and the skip option says what you lose. ❌ Not OK if skipping still looks free.
2. **Final read matches the runner** — continue to the recap. The Final read meters look like the runner's Live scores (lavender sliders with a number chip). ❌ Not OK if red/green bars remain.
3. **Tidy recap** — same screen: every dot sits beside its sentence, no empty dots, no empty date pills, no oversized gap at the top. ❌ Not OK if any of those linger.
4. **PDF in step** — Save as PDF. The Final read looks like the screen's. ❌ Not OK if the PDF still shows the old bars.
5. **QA button gone on live** — `live > sero.team > finish any run > recap` (after next deploy). No "Copy QA prompt" button. On localhost it still shows for you. ❌ Not OK if a tester could see it live.
