# Shape-matched loading skeletons

**Goal:** every screen's loading state previews that screen's real shape, built once in a central module so no page ever hand-rolls its own again.
**Driver:** Carl
**Created:** 2026-07-26
**Mockup:** none — the proof is the real rendered screen, throttled and screenshotted, not a mock. Phase 5 emits a side-by-side sheet of all ~40 routes.

## Done means
- A table ghosts as a table, KPI tiles ghost as tiles, a people list ghosts as avatar rows.
- Nothing jumps when the data lands: ghost row height matches loaded row height.
- One module owns every skeleton. No screen carries bespoke loading markup.
- The five text-only "Loading…" sentences are gone.

## Resolved before we start
- **Scope:** all ~40 routes, customer + internal, confirmed by Carl 2026-07-26.
- **Technique:** skeletons reuse the *real* layout CSS classes (`.run-list__row`, `.um-table td`, `.lp-tile`) and put ghost content in every leaf. Empty divs collapse badly: `.lp-tile` is ~32px empty vs ~120px loaded, `.um-table td` ~24px vs ~45px.
- **Ghost content = one `&nbsp;` inside a sized span**, not a bar div. Any inline content creates the real line box, so the ghost inherits the real font-size/weight/line-height and the row height is exact. No fake words (keeps find-in-page and text extraction clean).
- **Anti-flash is CSS, not a JS timer.** Every call site is a synchronous `root.innerHTML = shell(loadingHtml(n))` with several early-return paths; a timer would need a `stop()` on each one, which is exactly the per-page custom code being deleted.
- **Lane conflict, worked around:** session `3a8bfd02` holds `design.css`, `tokens.css`, `DESIGN.md` and `lint-design-tokens.js`. So the skeleton CSS stays inside `motion.css` (unclaimed, already imported by both apps, already allowlisted as decorative by the token linter) instead of moving to a new file. No new token needed. The DESIGN.md rule moves to Phase 5.
- **Baseline before any work:** `npm test` 192/192 passing, 2026-07-26. No paid runs anywhere in this plan.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The module, invisible | `skeleton-parts.ts` + `skeleton-presets.ts` + CSS; the two doors become facades; anti-flash + screen-reader announcement | ✅ |
| 2 | Lists and tables | `list-rows` + `table` on 9 screens | ✅ |
| 3 | Detail, tiles, sections, two-column | `tiles` / `recap` / `sections` / `two-col` / `prose` on 10 screens | ✅ |
| 4 | The run lane and forms | `flowInterstitial` takes a spec; the run lane previews the screen it routes into | ✅ |
| 5 | The proof and the rule | A live "Loading skeletons" sheet in `/design`; DESIGN.md rule 5; clean-up Lens G | ✅ |
| 6 | The last twelve | Every remaining screen off the generic cards, including two recap views I had missed | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phases 1 to 5 ✅. **All six phases ✅, green-lit by Carl 2026-07-27. Plan closed.**

Carl restated the acceptance criterion as "all pages", and it wasn't: 13 screens were still on the generic grey cards, two of them my own miss. Phase 6 closed them. The count now:

- **Generic grey cards: zero.** `grep -rn "loadingHtml([0-9)]\|createSkeleton([0-9)]" admin/src frontend/src` returns nothing outside the kit and its tests.
- **Text-only "Loading…": one**, on purpose. `ui/account-sheet.ts:103` is a disabled input whose placeholder reads "Loading…" while the company name arrives. It is already at its final size, so nothing jumps.
- **Not ghosted, on purpose: one.** `/new` pops its roster in. The screen cannot know a roster is coming, so a ghost would trade a pop-in for a shrink-back. See [phase-4.md](phase-4.md).

**The proof sheet** is at `/design` → "Loading skeletons": every preset rendered live from the real module above the real markup, measured in the browser. Six exact, the interview question 6.4px, KPI tiles carry a note (2.8px measured in place on /pulse). Nothing flagged.

`npm test` 197/197, typecheck clean, both lints pass. No screenshots anywhere in this plan: the preview pane will not composite frames, so every claim above is a measurement of the live rendered DOM.

### What each phase found
Detail per phase in its own file. The three that matter:
- **Phase 4:** the kit's CSS was being beaten by any stylesheet imported after `motion.css`, so the ghost answer box rendered 96px against a real 153px and ghost avatars painted the real avatar's colour. All kit rules are now double-classed.
- **After Phase 5, from Carl's screenshot:** `.sk-leaf` was inline, and `width` does nothing on an inline element, so bare ghost lines collapsed to a few grey pips. Heights had all measured correct, which is exactly why the sheet now exists.
- **Phase 6:** the sheet's own numbers were width-dependent and were measured before the fonts landed. Pinned to a 760px column, re-measured on `document.fonts.ready` and on resize.

### The one honest limit, stated everywhere it matters
**A ghost is correct at the width its screen uses, and drifts at others.** Every height here is a count of wrapped text lines, and a skeleton cannot know how long the text will be. That is why table rows match a short row but not a wrapped one, why the tiles preset is tuned to Pulse's 168px grid track, and why the proof sheet pins its own width.

## Parked
- Converting `skeleton.js` → `.ts`. Twenty stages import `"./skeleton.js"`; renaming is pure churn. Revisit in Phase 5 if wanted.
- Moving skeleton CSS out of `motion.css` into its own `skeleton.css` (+ a `--sk-shimmer-hi` token). Blocked by lane `3a8bfd02`; purely organisational, no behaviour change.
- A per-preset "density" option (compact vs comfortable rows). No screen needs it yet.
