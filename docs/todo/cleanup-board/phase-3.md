# Phase 3 — Repoint old plans at the board (surgical)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Every old planning file either is the board or points at it, with one-line banners — nothing else changes.

## Changes
- `PLAN.md` (root): banner at top — superseded by `SERO_BOARD.md`, kept as done-archive.
- `plans/AUDIT.md`, `plans/FEATURES.md`, `plans/log-fix-audit.md`: banner — reference docs; active work lives in `SERO_BOARD.md`.
- `docs/todo/person-profiles/PLAN.md`: **Parked** banner with reason ("manager-first MVP; no history analytics — see SERO_BOARD.md").
- `docs/todo/inbox-review-june-10/PLAN.md`: **Parked** banner ("review tooling, revisit after next build stage — see SERO_BOARD.md").

## Not in this phase
- `plans/DESIGN.md` / `plans/PRODUCT.md` untouched (specs, not work-tracking).
- No folders moved or deleted. No content below the banners edited.

## Done when
- [ ] All six files carry their banner; nothing else in them changed.
- [ ] Product owner has tested the scenarios below and said go.
- [ ] Green light → docs-only commit: `git add PLAN.md plans/AUDIT.md plans/FEATURES.md plans/log-fix-audit.md docs/todo/person-profiles/PLAN.md docs/todo/inbox-review-june-10/PLAN.md docs/todo/cleanup-board/`

## Test scenarios — for the product owner
1. **Pointer test** — open any of the six files. Within the first three lines you know it's not the active board and where the board is. ❌ Not OK if you have to scroll.
2. **Banner-only diff** — `git diff PLAN.md plans/` shows only added banner lines, zero removed/changed content lines.
3. **Nothing lost** — `docs/todo/person-profiles/` and `docs/todo/inbox-review-june-10/` still have all their phase files.
