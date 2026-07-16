# Phase 1 — Build the layout

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Add "Before · During · After" as a real, production layout for the prep brief — built in Sero's
design tokens — that an admin can switch to and see render correctly with real data.

## Changes
- **`frontend/src/stages/preparation-brief.ts`** — add a new `render` function for the layout
  (the vertical spine: *Before you walk in* = theme + confidence · *In the room* = opener callout,
  listen-for, don't-assume, your move · *Leave with* = outcome). Register it in `RENDERERS`, add
  an entry to `VARIANTS` (label e.g. "Arc"), and add its preview thumbnail to `PV_THUMB`.
- **`frontend/src/stages/preparation.css`** — add the layout's styles, using the existing design
  tokens the other `pv-*` variants use (accent / accent-soft / accent-dark, border, ink). No raw
  hex — tokens only, matching the house rule.
- Content is the existing 7 slots from `extractSlots` — no data, engine, or API change.

## Not in this phase
- Making it the default managers see (that's Phase 2).
- Touching any admin/review render of the brief.

## Done when
- [ ] The layout renders all 7 pieces with real content, arranged as Before / During / After.
- [ ] `npm test` green (the existing `preparation-brief.test.ts` loop now also covers the new
      layout — all 7 slots present, nothing duplicated, labels truthful) and `npm run typecheck`
      clean.
- [ ] Seen on the **real running app** (dev server), switched to via the admin layout picker, with
      a screenshot — not just "the code looks right."
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner (Carl)
Walk through these yourself. Phase 2 waits for your green light.
1. **It shows up** — on the prep-brief screen (as admin), open the **Layout** picker. You should
   see the new layout listed (its little preview tile looks like a vertical timeline). ❌ Not OK if
   it's missing or the tile looks like something else.
2. **It reads as a meeting** — switch to it. You should see three clear stages top-to-bottom:
   **Before you walk in** (the theme + how-sure line), **In the room** (the opening question in a
   tinted callout, then listen-for / don't-assume / your move), **Leave with** (the outcome).
   ❌ Not OK if the pieces are in a random order or a stage is missing.
3. **Same words as before** — compare against another layout in the picker. The actual content
   (Priya, the opener, the lists) should be **identical** — only the arrangement differs.
4. **It looks like Sero** — calm paper background, white where expected, one blue button, headings
   in the Sero display font. ❌ Not OK if colours look off-brand or text is tiny (<14px).
5. **Phone width** — narrow the window. It should stack cleanly with no sideways scroll.
