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
| 1 | The module, invisible | `skeleton-parts.ts` + `skeleton-presets.ts` + CSS; the two existing doors become façades; anti-flash + screen-reader announcement; `list-rows` proven | ✅ |
| 2 | Lists and tables | `list-rows` + `table` wired to 9 screens: /runs, Home recents, /library and the five admin tables | ✅ |
| 3 | Detail, tiles, sections, two-column | `tiles` / `recap` / `sections` / `two-col` / `prose` wired to 10 screens: /pulse, the three recap surfaces, /admin/feedback, /admin/errors, /job-lexicons, /guide, the stage data tab | 🔨 |
| 4 | The run lane and forms | `flowInterstitial` takes a spec; /bank /evaluate /focus /prepare /interview each preview what they're generating; /join gets a form ghost | 🔨 |
| 5 | The proof and the rule | `--skeletons` flag on the gallery exporter → side-by-side sheet of all 40; DESIGN.md rule; clean-up skill check | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phases 1, 2 and 3 ✅. Phase 4 built, awaiting Carl's walk: **34 screens** now ghost as themselves.

Phase 4 proof in [phase-4.md](phase-4.md). The run lane's waits now preview the screen they route into. It also turned up a systemic bug: the kit's CSS sits in `motion.css`, and every stylesheet imported after it was quietly beating the kit's rules at equal specificity, so the ghost answer box rendered 96px instead of 153px and the ghost avatar painted the real avatar's background. All kit rules are now double-classed. Measured after the fix: focus point card exact, answer box within 0.4px, question card within 13.6px.

Not done on purpose: the `/new` roster pop-in. Ghosting it would trade a pop-in for a shrink-back for guests and new managers. Reasoning in [phase-4.md](phase-4.md).

### Earlier

Phase 3 proof in [phase-3.md](phase-3.md). The headline: a Pulse tile is 255px tall, not the 120px a one-line ghost gave, because its label and caption wrap at the grid's 168px track. Now within 2.8px. `recap` renders but could not be measured against a loaded run (the dev account has no run history), so that one wants Carl's eye.

Two text-only "Loading…" strings survive, both inside chat `d03316aa`'s lane.

Phase 2: 9 screens. Lists are pixel-exact (Home recents 0/0/0, Past 1:1s 0 across nine elements). Tables match toolbar, head and column proportions; row height matches the shortest real row but runs one line short of a wrapped one, because a real table row grows with content the skeleton hasn't got yet. Stated rather than tuned.

Proof in [phase-2.md](phase-2.md). Lists are pixel-exact (Home recents 0/0/0, Past 1:1s 0 across nine elements). Tables match toolbar, head and column proportions; row height matches the shortest real row but runs one line short of a wrapped one, because a real table row grows with content the skeleton hasn't got yet. Stated rather than tuned.

`npm test` 196/196, typecheck clean, both lints pass. No screenshot: the preview pane will not composite frames.

Deferred out of Phase 2 into Phase 3: `frontend/src/stages/member-home.js` (its section shapes live in `member-home-view.ts`, held by chat `d03316aa`), plus /team, /members, /personas for the same reason.

## Parked
- Converting `skeleton.js` → `.ts`. Twenty stages import `"./skeleton.js"`; renaming is pure churn. Revisit in Phase 5 if wanted.
- Moving skeleton CSS out of `motion.css` into its own `skeleton.css` (+ a `--sk-shimmer-hi` token). Blocked by lane `3a8bfd02`; purely organisational, no behaviour change.
- A per-preset "density" option (compact vs comfortable rows). No screen needs it yet.
