# Phase 009 — Merge duplicates + roll-ups

## Goal (plain)
Grow the auto-built Team into a managed one: let a manager **merge duplicate people** and see simple
rating roll-ups — the two things that only matter once a manager has real history.

## What you'll have when it's done
- **Merge two cards** that are the same person ("Priya" + "Priya S." → one), and edit a name — so the Team
  stops splitting on free-text names.
- **Rating roll-ups** per person (average usefulness with count).

## Re-scoped after the CTO review
- **Empty / loading / error states are no longer here** — each earlier phase now owns its own three states
  (OVERVIEW standing expectations), so nothing is warehoused to be retrofitted last.
- **"Add a person ahead of time" (manual roster) → parked** (see PROGRESS). A 2–3 manager alpha proves the
  return-visit loop, not manual roster entry; build it only if a real manager asks.
- **Trend sparkline / "improving" chip → parked** — noise on a handful of ratings; post-alpha.

## A grounding example (before → after)
- **Before:** "Priya" and "Priya S." are two Team cards with split history.
- **After:** the manager merges them into one card with all 4 meetings and a combined average.

## The steps (to be detailed when this phase starts)
1. Decide the smallest real store for person identity (a light `people` record, or a per-manager alias
   map) — introduce it only now that we know the shape from Phases 004–005. **Flag the choice to Carl**
   (2–3 plain options + a recommendation) before building.
2. Merge/edit UI on Team + person pages; re-point run grouping at the resolved person (an alias remap on
   the Phase 004 normalized key, not a re-architecture).
3. Rating roll-ups.

## What we reuse (don't rebuild)
- Everything from 001–008; this phase adds the explicit-management layer on top.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Merge two duplicate people → one card, combined history + average; the merge sticks after reload
  (**verify the destination**, not just the code).
- Edit a person → reflected on Team + person views.
- No OpenAI calls; `npm test` + typecheck green.

## Note
This is deliberately last: we only introduce a person store **after** Phases 004–005 have shown us the
real shape, so we don't over-build it up front.

> **Status:** overview only. Detailed step files get written when we start this phase.
