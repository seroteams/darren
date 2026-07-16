# Phase 2 — "Continue deeper" digs into the issues raised

**Part of:** [plan.md](plan.md) · **Status:** ⬜ (starts after Phase 1 is green-lit)

## Goal
When the manager clicks **Continue deeper** at the wrap-up moment, the follow-up questions aren't generic — they dig into the **specific issues the manager already raised** in this conversation (the snags, tensions, and threads that surfaced), pulling out more detail on them.

## Changes
- **A "deep-dive" continuation mode** — when Continue deeper is chosen, tag the session so the next turns are planned to drill into the already-surfaced topics rather than open new arc ground. Reuses the planner's existing thread-follow machinery (it already tracks the live threads/answers) — pointed deliberately at the raised issues instead of arc coverage.
- **Prompt/plan tweak** — a focused instruction to the plan-turn step (or a dedicated deep-dive slot) so the added questions clearly reference what the manager said, and ask for the next layer of detail (the "why", the specifics, what they've tried).
- **A sensible cap** so Continue deeper doesn't run forever — it deepens for a bounded stretch, then reaches the closer.

## Not in this phase
- The detection / the two buttons (Phase 1 owns those).
- Per-type tuning (parked).

## Done when
- [ ] After clicking Continue deeper, the next questions demonstrably reference issues the manager already raised (not fresh unrelated topics) — checked on a real run.
- [ ] The deep-dive stretch is bounded and still reaches a proper closer / briefing.
- [ ] `npm test` green + typecheck clean; a real deep-dive run screenshotted.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **It digs into what I raised** — on a rich bi-weekly, mention a specific snag (e.g. "the cutover date keeps slipping"), reach the wrap-up, click **Continue deeper**. The next questions should clearly zero in on *that* issue and ask for more detail — not jump to something unrelated. ❌ Not OK if it asks generic new questions.
2. **It still wraps up** — keep answering; the deep-dive should reach a natural close and a briefing, not loop endlessly. ❌ Not OK if it never ends.
3. **The briefing reflects the extra depth** — the final briefing should be richer on the issue you dug into. ❌ Not OK if the extra detail is lost.
