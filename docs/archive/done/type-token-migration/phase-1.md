# Phase 1 — meeting-arcs page

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done (tested by Carl 2026-07-06)

## Goal
Every text font-size in the meeting-arcs page reads a `--type-*` token, and the one missed floor breaker is fixed.

## Changes
- `admin/src/stages/meeting-arcs.js` — swap the 12 literal `font-size` values (lines 21, 25, 28, 35, 39, 40, 42, 47, 53, 74, 80, 83) for tokens per the PLAN mapping table.
- Line 53 (`.arc-btn--mini`, `.85rem` = 13.6px) → `--type-body-sm` — this also lifts it back over the 14px floor.
- Fold in the already-made fix at line 67 (`.78rem` → `var(--type-label)`).

## Not in this phase
- The glyph sizes in this file (none here) or any other file.
- start-stage / test-engine / tasks-board — that's Phase 2.

## Done when
- [ ] All 12 literals in meeting-arcs.js are tokens; no raw px/rem `font-size` left on text in this file.
- [ ] Nothing in the file renders below 14px.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Open the meeting-arcs page** — the arc cards read normally: chips, phase labels, intent lines all legible, nothing suddenly tiny or huge. ❌ Not OK if any label looks shrunken or the layout jumps.
2. **Mini buttons** — find the small "mini" action buttons on an arc. Their text should look the same or a hair larger than before (it was slightly under the floor). ❌ Not OK if still visibly tiny.
3. **Open the edit form on an arc** — the uppercase field labels (already fixed) and every input/label read cleanly at a comfortable size. ❌ Not OK if a label is cramped or clipped.
4. **Eyeball the sizes together** — headings still outweigh body text; the hierarchy didn't flatten. A couple of things may be ~1px different — that's expected.
