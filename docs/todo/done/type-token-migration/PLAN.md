# Typography token migration

**Goal:** Every off-system hardcoded font-size on the standard app surfaces uses a `--type-*` token instead of a raw px/rem literal.
**Driver:** Carl
**Created:** 2026-07-06

## Done means
- No standard-surface text element sets `font-size` with a raw px/rem literal — all read a `--type-*` token.
- Nothing renders below the 14px floor (this also sweeps up one breaker the earlier audit missed).
- The pages still look right after the small rounding shifts (that's what QA checks).

## Scope — what's actually in and out
The raw grep found ~50 literal `font-size` values. Most are **not** in scope:
- **Glyphs (exempt, leave):** ✓ checkmarks (`session-topbar` 0.7em, `one-page-run` 0.85em), the trend shape (`admin-tables` 0.85em), the `⋯` menu button (`admin-tables` 18px), ★ stars (`admin-tables` 1.75rem), status-dot numbers (`test-engine` 12px, `tasks` 11px). DESIGN.md: the floor is about labels, not glyphs.
- **Special surfaces (excluded by Carl):** the `universe.ts` dark visualization (~22 literals) and the `tasks.js` mono git-sync panel (~8) — dev-chrome-style, own palette. Left alone.

**In scope = ~15 real text declarations:**
| File | Lines | What it is |
|---|---|---|
| `admin/src/stages/meeting-arcs.js` | 21, 25, 28, 35, 39, 40, 42, 47, 53*, 74, 80, 83 | Arc catalogue + edit form (one page). *:53 = the missed 13.6px floor breaker. :67 already fixed. |
| `admin/src/styles/design/start-stage.css` | 125 | Session breadcrumb strip base size (15px) |
| `admin/src/styles/design/test-engine.css` | 104, 144 | Job-lexicon list item; one heading |
| `admin/src/styles/design/tasks-board.css` | 113 | `.tk-code` inline mono (borderline dev — confirm, likely leave) |

## Mapping convention (round to nearest existing token; ties round up, never shrink text below its current size unless fixing the floor)
- `.85rem` 13.6px → `--type-body-sm` (14px) — floor fix
- `.9rem` 14.4px → `--type-body-sm` (14px)
- `.95rem` / `15px` 15.2–15px → `--type-body` (16px)
- `1rem` 16px → `--type-body` (16px)
- `1.05rem` 16.8px → `--type-body` (16px) unless it's a heading → `--type-h4`
- `1.1rem` 17.6px → `--type-h4` (18px)

Some elements shift by up to ~1.2px. That is deliberate and is exactly what the per-page QA walk is checking.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | meeting-arcs page | 12 declarations → tokens + fix the :53 floor breaker | ✅ |
| 2 | Stragglers | start-stage breadcrumb, test-engine list/heading, decide tk-code | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Both phases ✅ done + committed. Plan closed → moved to `docs/todo/done/`** (Carl tested 2026-07-07). Phase 1 `16deceba`; Phase 2 = start-stage breadcrumb `15px → --type-body-sm`, test-engine `.joblex-item 0.95rem → --type-body`, with `.joblex-remove` (× glyph) and `.tk-code` (dev mono) deliberately left. Tests 82/82. Follow-on work (reading text → 16px) lives in [../standard-text-16px](../standard-text-16px/PLAN.md).

## Parked
- **Pixel-perfect alternative:** instead of rounding to existing tokens, add new scale steps (`--type-body-md` 15px, etc.) so nothing shifts. More tokens, zero visual change. Rejected as default (bloats the scale) — raise if the rounding shifts bother you in QA.
- **`⋯` menu → Lucide icon:** the `admin-tables` kebab button is a text glyph; DESIGN.md §5 wants Lucide. Separate concern from typography — not in this plan.
- Special surfaces (`universe.ts`, git-sync panel) onto tokens — excluded by choice; revisit only if we retire the dev-chrome exemption.
