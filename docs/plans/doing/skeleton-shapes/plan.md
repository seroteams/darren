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
| 1 | The module, invisible | `skeleton-parts.ts` + `skeleton-presets.ts` + CSS; the two existing doors become façades; anti-flash + screen-reader announcement; `list-rows` proven | 🔨 |
| 2 | Lists and tables | `list-rows` / `table` / `timeline` wired to ~14 call sites across /runs /team /members /library and the admin tables | ⬜ |
| 3 | Detail, tiles, sections, two-column | /pulse /runs/:id /team/:person /admin/users/:id /run/:id /job-lexicons /meeting-arcs /guide /admin/feedback /admin/errors — and the 5 text hold-outs die | ⬜ |
| 4 | The run lane and forms | `flowInterstitial` takes a spec; /bank /evaluate /focus /prepare /interview /compare /lexicon each preview what they're generating; /new and /join get form ghosts | ⬜ |
| 5 | The proof and the rule | `--skeletons` flag on the gallery exporter → side-by-side sheet of all 40; DESIGN.md rule; clean-up skill check | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 built, awaiting Carl's walk. Zero screens migrated, as intended. Baseline was 192/192; now 194/195, and the single failure is another chat's (`runs.test.ts` slices the source between `function aboutEntry` and `function initialOf`, and chat `d03316aa` moved `initialOf` into `ui/avatar.ts`). Proven not mine by reverting only my line and watching it still fail.

Geometry proof is in [phase-1.md](phase-1.md): ghost against loaded on the real `/admin/runs`, nine elements, every diff 0. Not screenshotted: the preview pane would not composite frames.

**Blocking Phase 2:** `admin/src/stages/runs.ts` is claimed by chat `d03316aa`.

## Parked
- Converting `skeleton.js` → `.ts`. Twenty stages import `"./skeleton.js"`; renaming is pure churn. Revisit in Phase 5 if wanted.
- Moving skeleton CSS out of `motion.css` into its own `skeleton.css` (+ a `--sk-shimmer-hi` token). Blocked by lane `3a8bfd02`; purely organisational, no behaviour change.
- A per-preset "density" option (compact vs comfortable rows). No screen needs it yet.
