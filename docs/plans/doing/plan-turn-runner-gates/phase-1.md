# Phase 1 — Item-shape gates

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ green-lit + committed `0d4325f1` (2026-07-07)

## Goal
Every materialized `new_queue` item is well-formed before it flows downstream: valid axis ids, a name within the word cap, and all eight required keys present — otherwise the item is repaired or dropped, with the reason logged.

## Where
- [backend/engine/reconcile-queue.ts](../../../backend/engine/reconcile-queue.ts) — the item materialization + validation layer (already drops ungrounded items; this adds sibling checks in the same pass).
- New mirrored test: `backend/engine/reconcile-queue.test.ts` (node:test, matching the pattern in [question-generator.test.ts](../../../backend/engine/question-generator.test.ts)).

## Changes
- **Axis-id whitelist** — any `axis_effects[].axis` not in `{wellbeing, engagement, clarity, growth}` is stripped from that item's `axis_effects`. If stripping empties `axis_effects`, drop the item (a queue item must have a non-empty `axis_effects` per the prompt's `<rules>`). Log `issues.push("axis-whitelist: ...")`.
- **Name word cap** — any `planner_added` item (ref_alias null) whose `name` exceeds 18 words is dropped (not truncated — a truncated question is worse than none). Log the drop. Carried items (ref_alias set) are exempt (they were vetted when first added).
- **Field-completeness** — any item missing one of the 8 keys (`ref_alias, label, name, description, purpose, stage, axis_effects, grounding`) is repaired where safe (e.g. `stage`/`ref_alias` may legitimately be null → fill null; `grounding` absent → `"open"`) or dropped where not (missing `name` or empty `axis_effects` → drop). Log each repair/drop.

## Not in this phase
- Cross-item / queue-level gates (budget length, closer, dangling ref_alias) → Phase 2.
- Any change to `assessment.note` → Phase 3.
- No new prompt edits — the prompt already states these rules; this is enforcement only.

## Done when
- [ ] `reconcile-queue.ts` strips non-whitelist axis ids, drops empty-axis / over-18-word / structurally-broken items, and repairs safe-to-fill missing keys — each with a logged issue string.
- [ ] `reconcile-queue.test.ts` covers: bad axis id stripped; item with only-bad axes dropped; 19-word planner_added name dropped; 18-word name kept; missing-key repair vs drop.
- [ ] `npm test` green (free baseline noted in PLAN.md; paid `npm run gate` only with Carl's OK).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Unit tests pass** — run `npm test`. You should see the new `reconcile-queue` gate tests listed and green. ❌ Not OK if any fail or the suite errors.
2. **Nothing regressed** — the rest of `npm test` is still green (same pass count as the Phase 1 baseline noted in PLAN.md, plus the new tests). ❌ Not OK if a previously-passing test now fails.
3. **Real run still looks normal** — replay a fixture scenario (free): `node scripts/replay-scenario.js <id> --fixtures-only`, then open the run in the admin console. The queue should look the same as before for a clean, well-formed run — this phase only bites *malformed* items, so a good run should be visually unchanged. ❌ Not OK if good questions vanish from a normal run.
