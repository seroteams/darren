# Phase 1b — Quieter map + richer panels

**Part of:** [plan.md](plan.md) · **Status:** ✅
*(Inserted by Carl 2026-07-10: "it's very busy and I don't really get it… look at what side panels open for all nodes and improve." Slots before Phase 2.)*

## ✅ GREEN-LIT 2026-07-11 — Carl's "A" on the before/after captures + live panel checks (commit d7f9d99f)

## Built (2026-07-10)
- `admin/src/stages/universe.model.ts` — nodes now carry panel data: core `tally` (people/runs/live), stage `partNames` + `liveHere`, type `usedCount`, lexicon `peopleNames`; `describeNode` renders the new rows.
- `admin/src/stages/universe.model.test.ts` — 4 new tests (red→green) + 1 deliberate update (lexicon panel now names linked people).
- `admin/src/stages/universe.ts` — sessions lose always-on labels; labels collision-skip (hover/selection always win, then core, then nearest); cross-link lines (flow < 1) draw only on hover/selection/focus; types/role-words/machinery render dimmer; pulses ride only the ring + session lines (max 2 per line); HUD now explains the picture first, controls second.
- Offline proof: `npm test` 115/115, `npm run typecheck` clean.
- Browser proof (real data, 18 people / 25 runs / 12 live): map renders with readable non-overlapping labels and no spiderweb; panels verified live — Sero: "People 18 · Finished 1:1s 25 · Live right now 12"; Question bank: "Step 4 of 7 + Machinery (all 5 parts)"; Bi-weekly check-in: "…Used in 10 finished 1:1s".

## Goal
The map calms down so the things that matter (people, live sessions, the pipeline) stand out, a first-time look explains itself, and every node's panel says something worth reading.

## Changes
**Canvas (universe.ts, untested by design):**
- Live sessions lose their always-on labels (they behave like other nodes: labeled when close, hovered, selected, or freshly arrived). The counts line still says how many are live.
- Labels no longer overlap: a label that would collide with one already drawn this frame is skipped (hovered/selected/core always win).
- Cross-link lines (meeting type→run, role words→person, type→Intake, stage→machinery) draw only when you hover/select one of their ends or focus — the structural lines (ring, Briefing→people, person→runs, session lines) stay.
- Meeting types, role words, and engine parts render dimmer than people/sessions/stages — three quiet kinds, two loud ones.
- Pulses ride only the main flow (pipeline ring + live-session lines), capped, instead of every line.
- The HUD explains the picture in one plain sentence before the controls line.

**Panels (universe.model.ts + tests, TDD):**
- Sero (core): adds "Right now" numbers — people, finished 1:1s, live sessions.
- Pipeline step: adds its machinery by name and how many live sessions sit there now.
- Meeting type: adds "Used in N finished 1:1s".
- Role words: adds the people it's linked to by name.

## Not in this phase
- Health signals (P2), cost (P3). No data changes, no backend, no new endpoints.

## Done when
- [ ] `npm test` + `npm run typecheck` green (model rows test-first).
- [ ] Side-by-side: the default view shows visibly fewer labels/lines than before, with people + sessions clearly the loudest things.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **First look reads calmer** — open the Universe zoomed out. You should see the ring, glowing people, and comets — not a pile of overlapping text in the middle. ❌ Not OK if labels still stack on each other.
2. **The story is on screen** — the top-left text should tell you what you're looking at in one sentence, before the controls.
3. **Lines appear when they mean something** — hover a meeting type: its lines to the 1:1s that used it appear; move away: they go. Structural lines (ring, people) never disappear.
4. **Every panel earns its click** — click Sero (live numbers), a pipeline step (its machinery + who's sitting there), a meeting type (how used), a role word list (who it's linked to). ❌ Not OK if any of those still shows a single lonely row.
5. **Nothing lost** — filters, search, focus, Update, the recency glow from Phase 1 all still work; hidden things are still findable via search and hover.
