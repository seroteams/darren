# Phase 6 — The last twelve

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-27 — Carl walked the whole plan and signed it off (commit fd778f1b)
## Why this phase exists
Carl restated the acceptance criterion: the loading state has a similar structure to the loaded page **for all pages**. It wasn't all pages. A count found 13 screens still on the generic grey cards, two of them my own miss (I had migrated each admin screen's list but not its second, inner recap state). The rest had been blocked behind another chat's lane, which cleared.

## Built (2026-07-27)

One new preset, `lex-rows`, for the lexicon review's Keep/Drop rows.

Wired the last twelve:

| Screen | Preset |
|---|---|
| Admin runs, recap view **(my miss)** | `recap` |
| Guest runs, recap view **(my miss)** | `recap` |
| Team | `list-rows` |
| Members | `table` |
| A person | `recap` |
| Member home, both sections | `sections` |
| Monthly Check-in | `sections` |
| Personas bench | `table` |
| Meeting arcs (was a text sentence) | `sections` |
| Compare | `sections` |
| Lexicon review | `lex-rows` |

## Done when
- [x] No screen in either app passes a bare row count: `grep -rn "loadingHtml([0-9)]\|createSkeleton([0-9)]" admin/src frontend/src` returns nothing outside the kit and its tests
- [x] The proof sheet shows every preset with no case flagged
- [x] Carl has walked the scenarios below and said go

## The count, after
- **Generic grey cards left: zero.**
- **Text-only "Loading…" left: one.** `ui/account-sheet.ts:103` is a disabled `<input>` whose placeholder reads "Loading…" while the company name arrives. That is a single form field already at its final size, so nothing jumps and a ghost would not improve it. Left on purpose.
- **Deliberately not ghosted: one.** `/new` (intake) still pops its roster in. Reasoning in [phase-4.md](phase-4.md): the screen cannot know a roster is coming, so a ghost would trade a pop-in for a shrink-back.

## Two things the proof sheet caught, that measuring had not
1. **The sheet's own numbers were width-dependent.** Its container is narrower than a real page, and every one of these heights is a count of wrapped text lines, so cases reported large false gaps. The pair is now pinned to a 760px reading column and scrolls sideways rather than squeezing. This is the same effect as the table-row and tile gaps: **a ghost is correct at the width its screen uses, and drifts at others.**
2. **It measured before the web fonts landed**, which gave nonsense on first paint. It now measures after `document.fonts.ready` and again on a `ResizeObserver`, so the numbers are always true for the current width.

## The sheet now reads
| Preset | Gap |
|---|---|
| List rows, Table, Card sections, Focus points, Form fields, Keep/Drop rows | **exact** |
| Interview question | 6.4px |
| KPI tiles | tuned to the Pulse grid: 2.8px measured in place on /pulse |
| Generic cards | no counterpart (the fallback) |

### Offline proof
`npm test` 197/197 · `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS · skeleton suite 31 tests.

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > the screens below, DevTools throttled to Slow 3G`
1. **The ones I missed.** Open Admin runs, click into a run. Then Guest runs, click into one. The wait should show a name block and cards, not grey boxes. ❌ Not OK if you see plain grey cards.
2. **The customer screens.** Open Team, Members, then a person. Each should ghost as itself: rows for Team, a table for Members, a name block and tabs for a person. ❌ Not OK if any shows grey cards or jumps on load.
3. **The last grey sentence is gone.** Open Meeting arcs. No "Loading meeting arcs…" text. ❌ Not OK if you see it.
4. **The sheet agrees.** Open Design, then "Loading skeletons". Nothing should be highlighted in amber. ❌ Not OK if anything is.
