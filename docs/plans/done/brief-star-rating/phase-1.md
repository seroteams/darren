# Phase 1 — Stars on the brief

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-30 — Carl walked the prep brief, tapped the stars, carried on into the questions (commit e21ed525)

## Built (2026-07-30)

**Landed**
- **The rating card on the prep screen.** `briefRatingHtml()` in `preparation-brief.ts`, rendered between the brief and the footer inside its own `.reveal` (`preparation.ts:184`). One edit, all 12 layouts.
- **One tap saves it.** `mountBriefRating()` in `wireResultHandlers`, reusing `createStarRating()` untouched. The score is held in a mount-scope `briefStars` so a layout switch cannot wipe it.
- **The look.** The `.pv-rate` card in `preparation.css`, tokens only. The stars needed no CSS at all: `.star-rating` already ships in `admin-tables.css` and `frontend/src/main.js:10` loads the design system globally.
- **Somewhere to keep the score.** `kind` and `stars` columns on `feedback_notes` (`schema.ts:372`), migration `0023_wooden_gamma_corps.sql`, with a backfill stamping legacy run-tied rows as `kind = 'verdict'`.
- **The save itself.** `POST /api/v1/feedback/brief-rating` (`server.ts:283`), origin-guarded, no login wall. `upsertBriefRating()` in the repo, `submitBriefRating()` in the service, one controller handler, and `submitBriefRating(runId, stars)` in `shared/api.js`.
- **The collision closed.** `upsertVerdict` now scopes its `where` on `(run_id, kind)` as well, so the two run-tied moments can no longer land on each other's row.

**Offline proof**
- `npm test` 215/215 (baseline before this work was 211/214; the 3 fails were a pre-existing design-guard hit in another session's file, since cleared).
- `npm run typecheck` clean · `npm run lint:copy` PASS · `npm run lint:tokens` PASS, no hard violations.
- 12 new service tests, written before the code, plus 4 new render tests.

**Walked on the real screen** (`local > admin > /admin/prepare`, run `2026_Jul29_23-46-0bf85fec…`)

Free throughout: the prep stream replays a cached brief (`session-streams.ts:89`), so no OpenAI call was made. Cost of this phase: nothing.

| Check | Result |
|---|---|
| Card renders under the brief, above the buttons | ✅ [p1-desktop-tapped.png](proof/p1-desktop-tapped.png) |
| Tapping the 4th star fills 4 and shows "Thanks" | ✅ |
| Row reaches Postgres, read back via `GET /api/v1/admin/feedback` | ✅ `stars: 4`, `kind: "brief_rating"`, right run id |
| Re-tapping a different score updates, never duplicates | ✅ 1 row, stars 4 → 2 |
| Brief rating + recap verdict on the SAME run both survive | ✅ 2 separate rows, verdict comment intact |
| Score survives an admin layout switch (the re-render trap) | ✅ still checked after switching to Bento |
| Phone width: stars on one line, 28px targets, no sideways scroll | ✅ [p1-phone.png](proof/p1-phone.png) |
| Keyboard: arrow keys move the score | ✅ 4 → 5, and it saved |
| Footer buttons unobstructed by the new card | ✅ all three hit-test clean |
| An out-of-range score is refused and writes nothing | ✅ 400, row unchanged |
| No console errors | ✅ (the one logged 400 is the deliberate bad-score probe) |

**Not walked by me**
- The guest path (logged out). Covered by a unit test and by the route carrying no auth guard, but not exercised in a browser.
- Clicking "Start 1:1 questions" through to the next stage: that generates questions and costs money, so it is left for Carl's walk.

Local test data left behind on this machine: one brief rating and one verdict on the Darryl run, so Phase 2 has something to show.

## Goal

A manager reading the prep brief can tap a score out of 5, and that score is stored against the 1:1.

## Changes

- **The rating card on the prep screen.** "How good is this brief?" and five stars, sitting under the brief and above the buttons. New pure function `briefRatingHtml()` in `frontend/src/stages/preparation-brief.ts` beside `ctaRowHtml()` (`:264`), dropped into the page at `preparation.ts:184-187` inside its own `.reveal` wrapper so it fades in with everything else. Placed there rather than inside a layout renderer, so all 12 lab layouts get it from one edit.
- **One tap saves it.** `createStarRating()` mounted and wired in `preparation.ts:199` (`wireResultHandlers`). Careful: that function re-runs on every re-render, so the chosen score is held in a mount-scope variable and passed back as `initialStars`, or an admin layout switch would wipe the manager's tap.
- **The look.** Card styling in `frontend/src/stages/preparation.css`. Design tokens only: `preparation-css.test.ts:33-61` reads this file and fails on any raw colour or any font-size under 14px. The stars themselves need no new CSS at all: `.star-rating` already ships in `admin-tables.css:382`, and `frontend/src/main.js:10` loads the whole design system globally.
- **Somewhere to keep the score.** Two new nullable columns on the existing `feedback_notes` table (`backend/db/schema.ts:372`): `kind` (text) and `stars` (integer). Generated migration `0023_*.sql`, plus a backfill setting `kind = 'verdict'` on existing rows that carry a `run_id`.
- **The save itself.** `POST /api/v1/feedback/brief-rating`, origin-guarded, no login needed so guests count. Extends the existing feedback domain rather than adding a new one: `upsertBriefRating()` in `feedback.repo.ts` alongside `upsertVerdict()`, both now scoped on `(run_id, kind)`; `submitBriefRating()` in `feedback.service.ts` rejecting anything that is not a whole number 1 to 5; one controller handler; the route registered at `server.ts:282`; `submitBriefRating(runId, stars)` in `shared/api.js` beside `submitRunVerdict` (`:229`).
- **Tests written first.** `feedback.service.test.ts` against the in-memory fake repo, including the case where a brief rating and a recap verdict share one 1:1.

## Not in this phase

- Anything in the admin console. Phase 2.
- Averages, histograms, trends. Parked.
- A comment box.

## Done when

- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy`, `npm run lint:tokens` all clean.
- [ ] Screenshot of the real rendered Prep screen showing the card, desktop and phone width.
- [ ] The score is read back OUT of the database via `GET /api/v1/admin/feedback` — a row with the right run id, `stars: 3`, `kind: "brief_rating"`. Not inferred from the code.
- [ ] Collision check on one 1:1: a brief rating AND a recap verdict both exist as separate rows afterwards.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner

Walk through these yourself. Phase 2 waits for your green light.

`local > app > start a 1:1 > Prep screen`

1. **The card is there** — run a 1:1 through to the Prep brief. Under the brief, above the Back / Copy brief / Start 1:1 questions row, you should see "How good is this brief?" and five empty stars. ❌ Not OK if it sits inside the button row, or pushes the buttons off screen.
2. **Tapping works** — click the fourth star. Four stars fill in and a small "Thanks" appears. ❌ Not OK if nothing happens, or the page jumps.
3. **It doesn't get in the way** — after rating, click "Start 1:1 questions". It should carry on exactly as before. Also check "Back" and "Copy brief" still work.
4. **On a phone** — narrow the window right down. The stars should stay tappable and on one line, not wrap or shrink.
5. **Keyboard** — tab to the stars and use the arrow keys. The score should change.
