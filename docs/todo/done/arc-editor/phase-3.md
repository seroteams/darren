# Phase 3 — Edit + save (write path with the guardrail)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Turn the read-only page into a real editor: change phases, tone, and anti-patterns, save the
changes (to the overlay, never the source), reset back to default, and get warned before any
edit that would orphan existing questions.

## Changes
- `POST /api/arcs/:slug` (validate via Phase 1 `validateArc` → write overlay) and
  `POST /api/arcs/:slug/reset` (delete overlay), both behind the localhost `originOk` guard
  like other POST routes. The save response carries the orphan warning when phase ids changed.
- `saveArc()` / `resetArc()` wrappers in `frontend/client/src/api.js`.
- Frontend editing in `stages/meeting-arcs.js`: inline edit of label/intent/target-questions,
  tone, and anti-patterns; add / remove / reorder phases; a Save button; a "Reset to default"
  per type; an "edited" badge on changed types; a confirm dialog that surfaces the orphan
  warning before a risky save.

## Not in this phase
- No `eval_rules` / regex editing.
- No standing test gate for orphans (that's optional Phase 4) — the warning is live in the UI.

## Done when
- [ ] Editing a field and saving persists across a reload.
- [ ] Saved edits live only in `data/arc-overlays/` — `type.js` files are untouched (clean
      `git diff` on `src/one-on-one-types/`).
- [ ] "Reset to default" removes the overlay and the page returns to the code arc.
- [ ] Renaming/removing a phase id that has tagged questions shows the orphan warning with a
      correct count before the save goes through.
- [ ] A new session for an edited type uses the edited arc (no server restart).
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Edit sticks** — change bi-weekly "Pulse" intent and bump its target questions to 2,
   Save, reload the page. The change is still there. ❌ Not OK if it reverts.
2. **Source untouched** — after that save, I'll show `git diff` on the type files is empty;
   the edit is only in the side-file. ❌ Not OK if a `type.js` changed.
3. **Reset works** — hit "Reset to default" on bi-weekly; it snaps back to the original
   Pulse → Friction → Momentum → Lift with original intents/counts.
4. **Orphan warning fires** — rename a phase id that has questions tagged to it; before
   saving you get a clear warning naming how many questions would be affected, and you can
   cancel. ❌ Not OK if it saves silently.
5. **Engine honours the edit** — after an edit, start a 1:1 for that type and confirm the
   served arc reflects your change (I'll show where to see it).
