# Phase 005 · Step 01 — The person page (click a card → their 1:1s)

## Goal
Make each Team card clickable, opening a person page that lists all the manager's 1:1s with that person,
with a small summary header.

## What you'll have
- Team cards (PG4) become keyboard-operable buttons. Clicking "Priya" opens `/team/:person` — her page.
- The page header: the person's name · role · **total meetings · last met · average usefulness** (with its
  rated-count), reusing the PG4 roll-up.
- Below it, **her 1:1s newest-first**, each row reusing the PG1 run row (date + ★ rating badge).
- Own loading / error / not-found states; a person with no matching runs (e.g. a stale/typo'd URL) →
  a clean "no 1:1s with this person yet" card, not a crash.

## A grounding example
- **Before:** the "Priya" card on Team goes nowhere.
- **After:** click it → her page, "★★★★☆ avg over 3 meetings", 3 rows listed newest-first.

## Technical detail
- New member stage `PERSON_DETAIL` at route `/team/:person` (the `:person` segment is the **normalized
  name key** from `groupRunsByPerson`, URL-encoded). Register via the existing stage/router/state pattern
  (parse, boot, popstate) exactly like `RUN_DETAIL` (PG2) — reuse that plumbing, don't invent a new one.
- New `admin/src/stages/person-detail.ts`: fetch `listMyRuns()`, reuse `groupRunsByPerson` to find the
  matching person by key, filter that manager's runs to `ctx.name` key === the route key, sort newest-first.
- Render the summary header from the grouped person object (name/role/count/lastMet/avgStars/ratedCount —
  all already computed in PG4) and the run list reusing the PG1 `.runs-list__row` markup. Escape all names.
- Team cards (`team.ts`): wrap each in a keyboard-operable `<button>`/link to `/team/<key>`, matching the
  PG2 row pattern; visible focus. Cards stop being display-only.

## Check
- `npm run typecheck` clean; `npm test` green. Click a card → the person page opens with the right header
  and the right runs; a person with 3 1:1s shows 3 rows + correct average; a bogus `/team/xxx` → the
  friendly not-found card. The fence holds — only the manager's **own** runs appear (no backend change;
  still `/runs/mine`). No OpenAI calls.
