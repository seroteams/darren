# Phase 2 — Stragglers

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The remaining off-system text sizes outside meeting-arcs read tokens.

## Changes
- `admin/src/styles/design/start-stage.css:125` — `.session-topbar__stages` base `15px` → token (breadcrumb strip; propose `--type-body-sm`, confirm by eye).
- `admin/src/styles/design/test-engine.css:104` — `.joblex-item` `0.95rem` → `--type-body`.
- `admin/src/styles/design/test-engine.css:144` — `1.05rem` → `--type-body` or `--type-h4` (depends whether it's a heading; decide with context at build).
- `admin/src/styles/design/tasks-board.css:113` — `.tk-code` `0.95em` mono: **decide** — it's inline code on a build-ish panel. Likely leave (dev-adjacent) or floor via `--type-body-sm`. Confirm with Carl.

## Not in this phase
- Anything in meeting-arcs (Phase 1).
- Glyphs and the excluded special surfaces.

## Done when
- [ ] start-stage + test-engine literals are tokens.
- [ ] A call is recorded on tk-code (migrated or deliberately left).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Session breadcrumb** — start a session; the stage breadcrumb strip along the top reads cleanly, steps legible, `✓` ticks still show. ❌ Not OK if the strip text looks shrunken or misaligned.
2. **Test-engine / job-lexicon** — open the test-engine job-lexicon list; items read at a comfortable size, the heading still stands out from the items. ❌ Not OK if item and heading look the same size.
3. **Tasks board** — if tk-code was changed, open the build/tasks board and check any inline code snippets still look right in their mono style. ❌ Not OK if code text broke the panel layout.
