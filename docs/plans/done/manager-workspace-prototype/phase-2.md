# Phase 2 — "No-data" feasibility overlay

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-15
Carl walked the overlay at `localhost:3200/test`. Feasibility dropdown with two independent
tiers (🔴 not built · 🟠 have data, not wired); red/amber toggle independently, state persists
across all five scenes, clean when off, 0px horizontal scroll at 390px with both on. `npm test`
5/5 co-located, `typecheck:admin` clean, `build` ok.

## Goal
Make the prototype double as a **feasibility map**: a control that outlines, with coloured
strokes + tiny corner tags, which on-screen elements aren't backed by real data/engine yet —
so "what we can and can't do" is visible at a glance. Serve it at `localhost:3000`.

## The control
A small **"Feasibility" dropdown** at the top of the workspace, with **two independent
checkboxes** (Carl's pick — flip each on/off separately):
- ☐ 🔴 **Not built** — no data or engine behind it today
- ☐ 🟠 **Have data, not wired** — exists in the backend, not in this shape/place

Default both OFF (the Phase 1 walk stays clean). Each checkbox toggles a class on the `.mw`
root (`mw--gap-red` / `mw--gap-amber`); state persists across scene changes.

## Flag mechanism (frontend-only, tokens only)
- `gap(tier, note)` helper writes `data-gap="red|amber" data-gap-note="<reason>"`.
- CSS outlines flagged elements (red = `--color-negative`, amber = `--sero-gold-700`) and
  renders the note as a corner tag via `::after { content:attr(data-gap-note) }` (≥14px).
- No literal colours; no fetch/storage/api — the co-located test enforces this.

## What gets flagged (the feasibility read)
🔴 **Not built:** meeting scheduling ("Next 1:1 · 10:30"), attention grouping + per-person
signals, cross-run "pattern to notice", tenure/join date, due dates, per-question
"From: <evidence>" chips.
🟠 **Have data, not wired:** "last 1:1 N days ago" on these cards, goal "current step",
private-notes panels.
🟢 **Real today (no flag):** roster identity, promises + owners + carry-over, goals,
generated grounded questions, "Sero's read" prep advice.

## Safety contract
- No new backend calls, storage, or dependencies; overlay is pure CSS + local state.
- Only `manager-workspace.prototype.ts` (+ its test) changes; path-scoped commit.
- 14px text floor held; no page-level horizontal scroll at 390px (`.mw` clips overflow).

## Not in this phase
- Building any of the flagged capabilities (scheduling, signals, pattern detection).
- Wiring the prototype to real data.

## Done when
- [ ] The Feasibility dropdown shows two checkboxes; red and amber toggle independently.
- [ ] With a tier on, only that tier's elements are outlined + tagged; off = clean.
- [ ] Overlay state survives moving between scenes.
- [ ] `npm test`, `npm run typecheck:admin`, `npm run build` stay green.
- [ ] No page-level horizontal scroll at 390px with overlays on.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these at `localhost:3000` → `/test` → "Manager Loop":
1. **Toggle each tier** — open Feasibility, tick 🔴 only (red outlines + tags on the not-built
   things), then 🟠 only, then both, then none. ❌ Not OK if a tier leaks into the wrong
   elements or the clean view isn't truly clean when both are off.
2. **State holds across screens** — turn red on, walk Today → Team → Aisha → Prepare →
   Follow-through; the outlines should stay on for each screen. ❌ Not OK if the toggle resets.
3. **Feasibility reads true** — check the flagged items match reality: scheduling, attention
   signals, patterns, due dates = red; last-1:1 date, goal step, private notes = amber. ❌ Not
   OK if something real is flagged, or something invented is left unflagged.
