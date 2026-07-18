# Phase 1 — Resolved-causes gate

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit 2026-07-18

## ✅ GREEN-LIT 2026-07-18 — Carl walked a live bi-weekly on the dev app (build 53801cdc); no reworded re-ask of the answered cause. Real-model proof satisfied by the live walk (the paid-replay alternative not needed). Commit 53801cdc.

## Built (2026-07-18)
- **Prompt** `content/prompts/plan-turn.md`: `<dedup_rules>` rewritten — planner now outputs `resolved_causes` (causes the manager has named + explained) and tags every `new_queue` item with `probes_cause` (copied from that list) + `new_layer`; output-shape + field-contract updated to match.
- **Schema** `backend/engine/queue-manager.ts`: `resolved_causes` added to the response schema, `probes_cause`/`new_layer` to each queue item (both required, so the model must tag every question); `resolvedCauses` parsed and passed to `reconcileQueue`.
- **Enforcement** `backend/engine/reconcile-queue.ts`: new pure `resolvedCauseHit()` — drops any item (carried-forward OR new) that re-probes a resolved cause with `new_layer=false`, placed early in the loop so a just-resolved cause kills a previously-queued twin; every drop logged to `planResult.issues` (engine-honesty, nothing silent).
- **Type** `backend/engine/queue-constants.ts`: `probes_cause?`/`new_layer?` on `RawQueueItem`, read defensively so old replay fixtures still parse.
- **Offline proof:** `npm test` 157/157 (5 new `resolvedCauseHit` cases green); `npm run typecheck` clean.
- **Honest limitation:** the drop is deterministic *given* the model's tags — if the planner mis-tags a real repeat as `new_layer=true`, it still slips. Embedding-based enforcement is parked (see plan.md).

## Goal
Each planning turn, the engine must explicitly name the causes the manager has **already explained** and check every waiting question against them — a question that re-asks a resolved cause is dropped in code, not left to the model's mood.

## Changes
- **Prompt** (`content/prompts/plan-turn.md`): replace the soft `<dedup_rules>` line with a required step — output `resolved_causes` (snags/causes the manager has already named and explained) and tag each queue item with the cause it probes. A tag matching a resolved cause without a clearly new layer = mark DROP with a reason.
- **Plumbing** (`backend/engine/queue-manager.ts` + `reconcile-queue.ts`): accept the new fields; enforce the drop in code; log every drop to `planResult.issues` so nothing disappears silently (engine-honesty rule).
- **Tests first** (mirrored test files): a fixture shaped like the tester's transcript — "other pressing deadlines" answered, a reworded twin queued → twin dropped; a new-layer follow-up ("what would take the pressure off") → kept.

## Not in this phase
- Embedding/semantic-similarity dedup (parked).
- Any change to question counts, arcs, or the wrap-up door.

## Done when
- [ ] Unit + replay fixtures green: reworded twin dropped, new-layer follow-up kept — `npm test` + `npm run typecheck` clean (free).
- [ ] ONE smallest paid replay (~$0.35) of the deadlines scenario against the live model: no re-ask appears in the actual served questions — verified in the run log, not assumed from code.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these on the dev app (I'll have it running and point you at the screen). Next step waits for your green light.

1. **No more déjà-vu** — start a **bi-weekly**; when asked what's slowing things down, answer *"mostly other pressing deadlines"* and carry on normally. No later question should ask again what's eating the time or crowding things out, however it's worded. ❌ Not OK if the same snag comes back in new clothes.
2. **Real follow-ups survive** — in the same run, a question that moves to a NEW layer (e.g. *"what would take the pressure off"*) should still appear. ❌ Not OK if the engine now avoids the topic entirely — resolved isn't taboo.
3. **Nothing else got weirder** — the rest of the run should feel like before: same length, same tone, questions still connect to what you said. ❌ Not OK if it feels disjointed or ends abruptly.
