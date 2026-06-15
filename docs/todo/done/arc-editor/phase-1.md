# Phase 1 — Overlay data layer + registry merge

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (green-lit 2026-06-14)

## Goal
The backend can store an arc "overlay" (your edits) in a side-file and merge it over the
code default when an arc is read — with validation and an orphan-count helper. No UI yet.

## Changes
- New `src/arc-overlay.js`, mirroring the overlay pattern in `src/role-profile.js`:
  `loadOverlay(slug)`, `writeOverlay(slug, data)`, `validKey`, null-safe load, atomic write.
  Overlay files live in `data/arc-overlays/<slug>.json`.
- New `validateArc(arc)` — rejects duplicate/empty phase ids, bad target-question numbers,
  empty arcs.
- New `diffStageIds(slug, newArc)` — counts how many existing `questions/` entries are
  tagged to a phase id that the new arc no longer has (the orphan count).
- Wire `src/one-on-one-types/index.js` (`getType`/`getArc`) to merge the overlay over the
  code default **at read time** (fresh read, like `loadOverlay`) so edits apply with no
  server restart. Back-compat shapes stay identical.
- Offline tests, registered in `scripts/run-tests.js`.

## Not in this phase
- No API endpoint, no UI — purely the data layer and the merge.
- No editing of `eval_rules` / `forbidden_question_res` / `prompts`.

## Done when
- [ ] With no overlay file, every arc reads exactly as it does today (nothing changes).
- [ ] Dropping a hand-written overlay JSON for one type changes what `getArc` returns for
      that type, and only that type.
- [ ] `validateArc` rejects an arc with duplicate ids, an empty id, or a bad target number.
- [ ] `diffStageIds` returns the correct count of questions that would be orphaned.
- [ ] `npm test` passes (new tests included).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Nothing changes by default** — I'll run `npm test` and show it green. With no edits
   stored, the app behaves exactly as before. ❌ Not OK if any existing test fails.
2. **A hand-made edit takes effect** — I'll drop a sample overlay file that changes the
   bi-weekly "Pulse" phase's intent, then show `getArc("Bi-weekly check-in")` returning the
   new intent — while the other four types are untouched. ❌ Not OK if other types change.
3. **Bad edits are refused** — I'll show the validator rejecting an arc with two phases
   sharing an id and an arc with a blank id, each with a clear reason.
4. **Orphan count is honest** — I'll show, for a sample rename, the exact number of existing
   questions that would lose their phase — proving the warning we build in Phase 3 will be
   accurate. ❌ Not OK if the count is wrong or silently zero.
