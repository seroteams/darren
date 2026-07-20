# Phase 2 — Fresh ground

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A second 1:1 about the same person prefers new ground: well-answered prior questions are suppressed; skipped/thin/declined ones are allowed back.

## Changes
- NEW `backend/engine/asked-history.ts` — clone of `focus-history.ts`: per-person prior asked questions `{name, label, alias, stage, when, read}`; answers read only to classify legacy turns, never emitted; same userId+personId fence (`historyRunMatches`); file-walk + pg dispatcher; caps last 5 runs / 80 items.
- `backend/db/runs-store.ts` — `pgAskedHistory` (copy of `pgFocusHistory:431-461`).
- `session.types.ts` — `Session.priorAsked?`; fetched ONCE in `session-streams.ts` bankStream (~100-177), stamped on session state, read by stage-03 and every serve turn (no second fetch). CLI parity in `cli/stages/question-bank.ts`.
- `question-generator.ts` — `{{PRIOR_ASKED_BLOCK}}` in the bank prompt + deterministic post-parse drop of generated repeats (`dropped_prior_repeat`, logged, never repaired). Ritual openers/intro stages exempt (exact list = Carl signs off in this phase's QA).
- `content/prompts/generate-questions.md` — prior-asked section: prefer new ground; re-ask only thin/skipped, acknowledging the revisit.
- `question-eligibility.ts` — optional `priorAskedNames`, new rejection reason `repeat_prior_run` (reuses Jaccard ≥ 0.7); serve-time call sites in `session-streams.ts:~472` + `cli/stages/questioning.ts:93,218`. `planTurn` untouched.

## Not in this phase
- No schema/migration, no origin tags, no embeddings, no ledger.

## Done when
- [ ] Tests: fence + a sentinel answer string provably never leaves `asked-history` serialization; `repeat_prior_run` fires at ≥0.7 similarity; `dropped_prior_repeat` logged; `pgAskedHistory` with injected rows.
- [ ] Free checks green (tests, typecheck, fixtures replay, bank prompt preview shows the block).
- [ ] ONE paid proof run (smallest, ~$0.35): second short run about an already-interviewed person — this is the build's single paid run.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **No re-treading** — complete a run about a roster person with decent answers. Start run #2 about the same person with similar notes. The question bank covers new ground — nothing that was well-answered in run #1 reappears in different words. ❌ Not OK if a run-#1 question shows up lightly reworded.
2. **Skipped comes back** — in run #1 skip a question. In run #2 that topic is allowed to return (and reads naturally, e.g. acknowledging it's a revisit). ❌ Not OK if skipping something buries it forever.
3. **First-session unchanged** — run about a brand-new person: bank looks normal, no odd "previously asked" behaviour.
4. **Opener ritual intact** — the warm opener still appears in run #2 even though it "repeats". (Sign off the exact exemption list here.)
