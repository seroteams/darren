# Phase 1 — the test screen

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built 2026-08-03, £0, awaiting Carl's walk

## Built

- `admin/src/stages/tests/last-one-to-one.js` (new) — the prototype.
- `admin/src/stages/test.js` — one import and one gallery entry.
- `.claude/launch.json` — an `l11-api` / `l11-web` pair on 3991/3993 so this session's preview does not clash with another chat's.

Nothing else was touched.

## What it shows

| Control | States |
|---|---|
| Screen | Repeat 1:1 · First 1:1 · Meeting started |
| Layout | A. Stacked · B. Sub-tabs (repeat only) |
| Panel toggle | Last 1:1 · Live scores (repeat) → Support · Live scores (first, started) |

Sections read the same fields the real build would: `briefing.headline` and
`summary_bullets` for Overview, the transcript's question and answer per turn for
Discussion, and the confirmed promises with their check-in outcomes for Agreed.
Live scores draws `briefing.axes` on a stated -6 to +6 scale, with an axis the last
meeting never read saying so rather than drawing a zero it did not earn.

## Reused rather than rebuilt

- `admin/src/styles/coach-panel.css` — the shipped split, toggle, hint rows and meters.
- `readyCardHtml()` from `admin/src/stages/questioning-ready.ts` — the left card, unchanged.
- `renderPromiseList()` from `admin/src/ui/briefing-view.ts` — Agreed, with its real chips.

Only `.l11-` rules are new and they carry colour and spacing only, so every face on the
screen still comes from a role in `design/type.css`.

## Verified

- `npm test` 232/232 · `npm run typecheck` · `npm run lint:copy` · `npm run lint:tokens`, all clean.
- Screenshots in [proof/](proof/), taken on the real rendered screen at 1440px and 390px:
  - `l11-A-stacked.png` · `l11-A-discussion.png` · `l11-A-agreed.png` — arrangement A
  - `l11-B-subtabs.png` — arrangement B
  - `l11-lastscores.png` — last meeting's four reads, including the not-read row
  - `l11-first.png` — a first 1:1, today's panel untouched
  - `l11-started.png` — the hand-over: Support and per-question hints, review gone
  - `l11-phone.png` · `l11-phone-toggle.png` — 390px, stacked, toggle wraps above the privacy line

## Known nit, not fixed here

In Agreed, each promise row is its own grid, so the owner column ("You" / the person's
name) does not align down the list at this 560px measure. That is the shipped
`.promise-row` recipe, not new. Worth a look in Phase 3 if arrangement A wins.

## Test scenarios — for the product owner

Open `/admin/test` → "The last 1:1, on the walk-in screen".

1. **Does Discussion read?** Screen: Repeat 1:1, Layout A. Scroll the right half. The five questions with your notes under them should be skimmable. ❌ Not OK if it reads as a wall you would never get through before walking in.
2. **A or B.** Flick Layout between A and B on the same content. Pick one.
3. **Last time's scores.** Tap Live scores. Four reads with their reasons, plus Growth saying it was never read. ❌ Not OK if it looks like this meeting's live scores.
4. **A first 1:1 loses nothing.** Screen: First 1:1. The panel should be exactly what it is today, and the left card should have no "Check off last time's" button.
5. **The hand-over.** Screen: Meeting started. Segment 1 should say Support and show coaching for the question, with no way back to the review.
