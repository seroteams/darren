# Phase 2 — Honest thread-follow stems

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
No garbled mirror stems ("tell will working — …"), and the generic fallback question never fires twice in one session.

## Changes
- `src/queue-manager.js` (`buildThreadFollowQuestion`, ~687-727): the mirror stem must be a **contiguous** 3-6 word span of the manager's answer (split on sentence/comma boundaries, strip leading filler). No clean span → skip the mirror and use the generic path. (This is engine-built text, so fixing its construction is allowed — it's not rewriting model prose.)
- `src/question-validator.js`: new check — a stem matching the mirror template (`… — can you say more about…`) must contain its pre-dash fragment *verbatim* in the answer; otherwise reject with a logged reason and fall back.
- `src/queue-manager.js` (`enforceThreadFollow`, ~729-767): dedupe the generic stem against asked questions **and** the current queue, re-check after any fallback substitution; rotate 2-3 context-free generic stems; if all are used, skip injection with a logged issue.
- `src/golden-checks.js`: update the `telegraphic_answer` golden in lockstep with the new builder template.

## Not in this phase
- Premise grounding (Phase 3). All rotation stems must stay context-free (Phase 1's lesson).

## Done when
- [ ] `npm run gate` green (including the Jun02 bad-follow-up sentinel still failing as designed)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Typo answer, clean question** — manual run; answer turn 2 with something telegraphic and typo-ridden like "tell him will keep working the angle". The follow-up should be either a clean quote of your words or a generic question — never word salad. ❌ Not OK if the question splices broken fragments of your answer.
2. **No repeats** — in one run, give two long answers a few turns apart so the engine follows up twice. The two follow-ups must not be the identical sentence. ❌ Not OK if "What made you read the situation that way at the time?" appears twice.
3. **Quotes are real quotes** — run one persona sweep; ask me for the list of every "— can you say more" question. Each quoted part should be text you can find word-for-word in the answer before it.
