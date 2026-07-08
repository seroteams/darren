# Phase 2 — Universe honest ring

## ✅ GREEN-LIT 2026-07-08
Carl walked all 3 scenarios live ("yeah its ok"): same ring on open, Update unchanged on data, and
the staged fake stage was announced both ways — "Pipeline step added: Shadow review." (8 planets),
then "removed" after the revert. Closed same day; last phase of the track.

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ green-lit 2026-07-08

## Goal
The Universe's pipeline ring stops being a private hand-typed copy: it derives from the app's real flow, and the Update button reports stage changes.

## Changes
- `admin/src/stages/universe.ts` — the `PIPELINE` ring derives from the router's real flow stages (intake → … → briefing) instead of its own hardcoded list; keep the friendly one-line subs as a lookup keyed by stage
- The "Update from the engine" button also diffs the ring vs the last snapshot and says "pipeline stage added/removed/renamed: …"
- `universe.test.ts` extended for the derivation

## Not in this phase
- Tasks board (phase 3)
- Any visual changes to the 3D rendering

## Done when
- [x] `npm test` green · no new typecheck errors (my slice green; the 1 whole-tree failure was another session's in-flight router.js edit)
- [x] Product owner has tested the scenarios below and said go (2026-07-08)

## As built (2026-07-08, $0)
- `universe.model.ts` — `PIPELINE` now **derives from `TOPBAR_STAGES`** (the rail every run
  screen renders) via `derivePipeline()`; the friendly one-line subs stay as a lookup keyed by
  stage. A stage the app grows appears under its topbar label with an honest "not yet described"
  sub — never silently dropped.
- Diff words un-muted for stages: `summarizeDiff` now says "1 new pipeline step just appeared"
  (they were deliberately excluded before, on the old "the ring is fixed" assumption).
- `ringChanges()` (pure, tested) — plain words for added / removed / renamed ring steps.
- `universe.ts` — one catch the spec missed: a ring change means new **code**, which means a page
  reload, which wiped the old in-memory diff baseline — so a ring change could never be announced.
  Fixed with a small localStorage snapshot (`seroUniverseRing`): first visit sets the baseline
  silently; after a reload the next Update (or the quiet minute-check) announces the change once,
  then re-baselines.
- Tests: +4 in `universe.model.test.ts` (derivation, growth fallback, diff wording, ringChanges),
  all red-first. `npm test`: my slice green; **95/96 whole-tree — the 1 failure is
  `router.test.ts`, caused by another live session's in-flight `router.js` edit (22:35), not this
  phase**. Both typechecks clean (two `frontend/welcome.ts` errors also belong to that session's
  uncommitted work). Browser-proven through a scratch Vite server (:3017): real bundle ring = the
  same 7 steps/labels, growth fallback + announcement words verified, screen module loads clean.

## Test scenarios — for the product owner
1. **Same universe** — open /universe. The ring shows the same 7 steps as before, labels intact.
2. **Update still real** — finish (or clone) a run, click **Update from the engine**. The new run appears and is called out, exactly as today.
3. **Ring honesty (with me)** — I'll temporarily add a fake stage to the app's flow (stage-labels.js); the page reloads itself, then Update should announce "Pipeline step added: …". I revert; the next Update announces the removal. ❌ Not OK if the ring stays at 7 silently.
