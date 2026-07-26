# Phase 3 — Detail, tiles, sections, two-column

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The remaining read screens ghost as themselves, and the last text-only "Loading…" sentences die.

## Changes
- Add the `tiles`, `recap`, `sections`, `two-col` and `prose` presets.
- Wire `/pulse` (tiles + table, the composed-spec case), `/runs/:id`, `/team/:person`, `/admin/users/:id`, `/run/:id`, `/job-lexicons`, `/meeting-arcs`, `/guide`, `/admin/feedback`, `/admin/errors`.
- Replace the five text hold-outs: `job-lexicons.js:27`, `meeting-arcs.js:47`, `guide.js` (three hosts), `admin/src/ui/stage-review.js:51`, `admin/src/ui/stage-data-tab.js:66`.

## Not in this phase
The run lane and forms.

## Done when
- [ ] Each screen's ghost matches its loaded shape (measured, not eyeballed)
- [ ] Grepping `admin/src` + `frontend/src` for `Loading…`, `Loading from the codebase`, `Loading job words`, `Loading meeting arcs`, `Loading session` returns nothing outside tests
- [ ] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > Pulse, then a person, then Guide`
1. **The dashboard loads as tiles.** Open Pulse. You should see ghost tiles the same size as the real number tiles, then a ghost table under them. ❌ Not OK if you see grey cards or the tiles change height when the numbers arrive.
2. **A person's page keeps its head.** Open someone in Team. Their name block should be there while the tabs below load. ❌ Not OK if the whole page is grey.
3. **No more grey sentences.** Open Guide and Job words. You should never see the words "Loading…" as plain text. ❌ Not OK if you do.
