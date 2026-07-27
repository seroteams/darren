# The visible type + radius pass

**PARKED 2026-07-27.** Opened from the 27 July clean-up sweep
([report](../../../reports/cleanup/2026-07-27.md), Lens A + G). Both passes were promised
only inside code comments, tracked nowhere. This folder is where they now live so they stop
being invisible.

**These are the two remaining pieces of design debt that change what a screen looks like.**
Everything invisible has already shipped (design-cleanup-invisible, closed 2026-07-27).
That is exactly why they need Carl's eye and were not swept up with the rest: type sizing
is his call, not a lint fix.

## Pass 1 — type ladder

DESIGN.md §T2/T3 sanctions the ladder 14 / 16 / 18 / 20 / 24 / 30 / 40. Two off-ladder
tokens and a set of literals survive, held at a fixed ceiling by
`scripts/test-design-guard.js` so they cannot spread.

| What | Where | Note |
|---|---|---|
| `--type-body-lg` (17px) and `--type-body-md` (15px), both banned | `admin/src/styles/design/tokens.css:288-291` | 13 call sites between them |
| 15px / 17px / 32px literals | `admin/src/styles/coach-panel.css:87,101,102,108,120,122` | 6 hits, 11 of the 13 lint warnings live here and below |
| 15px / 17px / 32px literals | `admin/src/stages/tests/runner-v2.js:145,157,179,180,184` | 5 hits, prototype screen |
| 30px literals (on-ladder, but not via a token) | `admin/src/styles/design/admin-pulse.css:23`, `frontend/src/stages/guided/guided.css:208` | the other 2 warnings |

**Decision Carl owns:** 17px → 16 or 18, and 15px → 14 or 16. Both directions are defensible
and both are visible. Do not pick this without him.

## Pass 2 — radius

DESIGN.md §5 sanctions exactly three values: 4px controls, 12px cards, full pills.

| What | Where |
|---|---|
| `--radius-offspec-8` (8px), 5 sites | `admin/src/styles/design/tokens.css:195` |
| `--radius-offspec-16` (16px), 2 sites | `admin/src/styles/design/tokens.css:196` |

Smaller and less contentious than the type pass. Could go first as a warm-up.

## Already done, do not redo

Both TEMPORARY token bridges (`--sero-radius-*`, `--type-small`) were closed on 2026-07-27
and their call sites repointed. The three misleading `@deprecated` markers on `.stage-wide`,
`.stage-step` and `.briefing-grid--pair` were corrected the same day: **those three rules are
live and their named replacements are not drop-in equivalents** (`.l-container--wide` adds
`padding-inline`; `.l-grid--pair` has no `:only-child` rule). Do not swap them blind.

## Guard

`npm run lint:tokens` (free) reports the counts and holds the ceiling. It passes today with
13 warnings and zero hard violations. The ceiling in `scripts/test-design-guard.js` comes
down as each pass lands.
