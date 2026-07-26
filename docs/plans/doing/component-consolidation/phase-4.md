# Phase 4 — Card and empty state

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

One card, and one "there's nothing here yet" panel.

Today there are three competing card recipes (`card`, `card-flat`, `ds-card`) plus seven bespoke families, across 193 places. And there are **14 different empty states** with no shared shape, so "no runs yet" and "no team yet" look like they came from different products.

## Changes

- New `admin/src/ui/card.ts` — one card renderer. `card-flat space-y-3` is used 31 times and is effectively an unnamed component; it becomes the named default.
- New `admin/src/ui/empty-state.ts` — icon, headline, one line of copy, optional action button. Replaces 14 class families across roughly 28 sites.
- The six avatar CSS families left over from Phase 2 fold in here.

## This one can move pixels

Same rule as Phase 3: before-and-after screenshots on at least one admin screen and one customer screen, attached before Carl walks it.

## Not in this phase

- Rewriting the empty-state words. Each screen keeps its own copy, it just gets the same shape.
- Card shadows or radius changes. Tokens already own those.

## Done when

- [ ] Card class strings outside `card.ts` are down to recorded exemptions.
- [ ] The 14 empty-state families are down to one, plus any recorded exemptions.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean.
- [ ] Before/after screenshots attached; `docs/screen-gallery/` regenerated.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > Runs`

1. **Cards look the same** — Runs, Team, Library. The white panels have the same padding, corners and spacing on all three.
2. **Empty Runs** — use a fresh account with no runs. The "nothing yet" panel has an icon, a headline and one line.
3. **Empty Team** — same account, Team screen. That panel is the same shape as the Runs one. ❌ Not OK if one is centred and the other is left-aligned, or the padding differs.
4. **Customer side** — `local > customer app > Home` with a fresh member. Its empty state matches too.
5. **Nothing shrank** — check a busy screen (a run with lots of notes). Nothing got cramped or overlapped.
