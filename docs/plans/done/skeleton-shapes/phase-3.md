# Phase 3 — Detail, tiles, sections, two-column

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-27 — Carl walked the whole plan and signed it off (commit fd778f1b)
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
- [x] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > Pulse, then a person, then Guide`
1. **The dashboard loads as tiles.** Open Pulse. You should see ghost tiles the same size as the real number tiles, then a ghost table under them. ❌ Not OK if you see grey cards or the tiles change height when the numbers arrive.
2. **A person's page keeps its head.** Open someone in Team. Their name block should be there while the tabs below load. ❌ Not OK if the whole page is grey.
3. **No more grey sentences.** Open Guide and Job words. You should never see the words "Loading…" as plain text. ❌ Not OK if you do.

---

## Built (2026-07-26)

Five new presets in `admin/src/ui/skeleton-presets.ts`: `tiles`, `recap`, `sections`, `two-col`, `prose`. Plus `skLines(classes, widths)` in `skeleton-parts.ts` for a leaf of several lines, and `.sk-line` / `.sk-two-col` in `motion.css`.

Wired (10 screens):
- **tiles + table (composed spec):** `admin-pulse.ts`
- **recap:** `run-detail.ts`, `admin-user-detail.ts` (recap view), `review-run.js`, `admin-feedback.ts` (recap view)
- **table:** `admin-user-detail.ts` (list view)
- **sections:** `admin-feedback.ts` (inbox), `admin-error-log.ts`, `guide.js` (screens host)
- **two-col:** `job-lexicons.js`
- **prose:** `guide.js` (commands + arcs hosts), `ui/stage-data-tab.js` (three sites)

### Offline proof
`npm test` 196/196 · `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS · skeleton suite 26 tests.

### On-screen proof (real dev app, viewport 1280)

**Pulse tiles** — the big win. Ghost against loaded:

| Part | Ghost | Loaded | Diff |
|---|---|---|---|
| Tile | 252 | 254.8 | 2.8 |
| Label | 43.38 | 43.4 | 0.02 |
| Value | 36 | 34.5 | 1.5 |
| Delta line | 47.38 | 50.73 | 3.35 |
| Caption | 86.75 | 86.79 | 0.04 |

A Pulse tile is only 168px wide at the grid's 10.5rem track, so its label wraps to two lines, its delta note to two and its caption to four: a real tile is 255px tall, not the ~120px a single-line ghost gave. That was the dashboard jumping by half its height. Matching it exactly is fair here, unlike a table row, because this copy is ours and fixed rather than user data. The residual 2.8px is the real delta chip's padding, which the ghost draws as a plain line.

**Job words** (`two-col`) — ghost renders the 256px rail beside the 649px content column, 17 ghost lines, announced as "Loading job words". No console errors.

**Guide** — all three hosts now ghost instead of showing a grey sentence; the real content still fills them; zero nested cards, so `prose` inside a `.card-flat` stays flat as DESIGN.md requires.

### Not measured
`recap` renders and is unit-tested, but I could not compare it ghost-against-loaded: the dev autologin account has no runs, so `/runs/:id`, `/admin/users/:id` and `/run/:id` have nothing to load. Worth a look during Carl's walk on an account with history.

### Still text-only, and why
Three "Loading…" strings survive, all inside chat `d03316aa`'s lane: `meeting-arcs.js:48`, `ui/stage-review.js:55`, and `ui/account-sheet.ts:103` (a disabled input placeholder, which belongs to the forms work in Phase 4 anyway).
