# Phase 2 — Mid-meeting questions carry coaching lines

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (green-lit)

## ✅ GREEN-LIT 2026-07-30 — Carl walked the Support panel across a live meeting: "the support questions are ok", passed all three phases (commits 914151c9 + 04f3a738)
He added one thing for later, recorded in plan.md's Parked: with more information and history about the person, the coaching needs to get better than it can be from setup notes alone.

## Goal
The questions the engine invents while the meeting is running carry their own coaching lines, not the prep-brief fallback.

## Changes
- `content/prompts/plan-turn.md` — the planner writes up to 3 tagged coaching lines for each question it queues, on the same craft rules as the bank stage.
- `backend/engine/queue-manager.ts` — the planner's response schema accepts `hints`.
- `backend/engine/queue-constants.ts` — `RawQueueItem` gains the field, so the planner's lines survive being read off the wire.
- `backend/engine/reconcile-queue.ts` — **the silent-drop risk.** It rebuilds every new or reworded planner question from a fixed list of fields; anything not named there vanishes without an error. The field gets carried explicitly, with a test that fails if it stops being carried. (Questions the planner carries forward unchanged keep their original object, so those already keep their lines; a REWORDED question must get fresh lines, never the old question's — the wording has changed.)
- Saved to the database with the question (jsonb, no migration; the Phase 1 codec fix covers the file copy).
- Tests: schema accepts and preserves hints through reconcile and the drill cap; a planner item with malformed hints degrades to none rather than breaking the turn.

## Not in this phase
- "Following up on..." thread-follows — those are minted in code with no model call (Phase 3).
- Any change to scoring, deltas or the Live-scores view.

## Cost + speed note (Carl's call before building)
This adds output tokens to the planner call that already runs on **every** question. Rough order: a few hundred extra output tokens per turn, so pennies per run and a small delay before each next question appears. No new API calls.

## Done when
- [ ] A replayed run shows a planner-queued question arriving at the browser with its own coaching lines (checked on the wire, not in the code).
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > admin (dev autologin) > start a 1:1 > answer 4-5 questions properly > Support tab`
1. **Deep into the meeting** — by question 4 or 5 the questions are engine-invented. The Support lines are still specific to the question on screen. ❌ Not OK if "From your prep brief" appears.
2. **No lag you'd notice** — the wait between submitting an answer and the next question feels the same as before. ❌ Not OK if it's clearly slower.
3. **Nothing breaks** — finish the meeting to the recap. Scores and the summary are unaffected.
