# Phase 3 — Honest wellbeing scoring (B2)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Don't score someone's wellbeing as bad just because they named *where* or *when* something happens. A bad wellbeing score should need a stated feeling (tired, sore, hurts, doesn't want to).

## Why
In the Brian run, wellbeing landed at −3 — but two of the three hits were just "when he is writing" and "when running after school." Those name a place/time, not how he felt. On rough, real-manager notes the scorer over-reads and inflates the number. There's already a strain-guard in the *briefing* stage, but the *scorer* has none, and a nudge that tells it to avoid scoring 0 makes it worse.

## Changes
- `content/prompts/plan-turn.md` (`<assessment_rules>`, signature-binding ~line 208; calibration ~line 242):
  - Add: don't realise a wellbeing negative unless the note names felt strain (tired, sore, hurts, doesn't want to, overwhelmed). A bare location/activity ("when writing", "after school") is off-signature → route to `note`, not a delta.
  - Soften the "avoid scoring 0" calibration so it exempts answers that only name where/when without a feeling — those may be 0.

## Not in this phase
- Changing how the briefing displays a weak score (parked as B5 — mostly falls out of this).
- The skip-after-skip drill cap (parked as B4).

## Done when
- [ ] A note that only names a place/time no longer drags wellbeing negative.
- [ ] A note that names a real feeling ("legs hurt", "so tired") still scores negative as before.
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light. (Needs a live walked run — ~$0.35; say go first.)
1. **Place/time only** — answer a wellbeing question with just a location ("when he's writing", "after school"), no feeling. Wellbeing should stay near neutral, and the briefing should say something like "not enough signal", not a confident low score. ❌ Not OK if wellbeing dives on a location alone.
2. **Real strain still counts** — answer with an actual feeling ("legs really hurt", "he's exhausted"). Wellbeing should still register negative. ❌ Not OK if genuine strain stopped registering.
3. **The Brian case** — re-walk a run like Brian's (legs, mostly locations, some skips). Wellbeing should read "not enough to say" rather than a hard −3. ❌ Not OK if it still lands −3 off place/time.
