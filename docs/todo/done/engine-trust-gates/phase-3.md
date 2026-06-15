# Phase 3 — Grounding gate for planner questions

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (offline 22/22; approved live check 2026-06-13 `--only biweekly-priya` PASS — model emitted `grounding` fields, gate fired once dropping a question for the word "snagging", a mild false positive since added to OPEN_QUESTION_VOCAB. Product-owner walk-through pending.)

## Goal
A planner question whose premise appears nowhere in this session (note, answers, prep brief) is dropped with a logged reason — never shipped.

## Changes
- `prompts/plan-turn.md`: every brand-new planner question (`ref_alias: null`) must include a `grounding` field — a ≤10-word verbatim quote from the note/transcript that establishes its premise, or the literal `"open"` for premise-free open questions.
- `src/queue-manager.js` (`planTurn` → `reconcileQueue`): pass a grounding corpus (note + answers + prep brief core) in. For new/reworded items: the `grounding` quote (when not "open") must appear in the corpus, and the question's rare content words (≥5 chars, outside a generic-conversation stoplist) must each appear somewhere in the corpus. Failure → drop the whole item (keep the `ref` carry-forward if one exists), log `grounding: dropped planner question with unsupported premise ("…")`. Never reword a stem.
- Thread-follows are exempt (they're built from the answer by construction).
- `src/golden-checks.js` + `evals/trust-checks.js`: post-hoc `runQuestionGroundingChecks` on served questions; wired as **`UNGROUNDED_PREMISE` at WARN level** first — promoted to hard fail later once we've seen the false-positive rate (parked).

## Not in this phase
- Hard-failing on `UNGROUNDED_PREMISE` (watch it at WARN first).

## Done when
- [ ] `npm run gate --judge` shows no new WARNs on the existing happy goldens; a new synthetic invented-premise golden trips the check
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **No invented promotions** — re-run the Marcus "something feels off" scenario (the one where turn 8 invented a "promotion decision"). No question should mention a promotion. ❌ Not OK if any question asserts an event you never told it about.
2. **Real premises survive** — manual run whose note explicitly mentions a promotion ("she's up for promotion this cycle"). A promotion question should still be allowed through. ❌ Not OK if the gate over-blocks things you actually said.
3. **Dropped, not reworded** — ask me to show a turn log where the gate fired: you should see a `grounding: dropped…` line and the served question being a normal queue item — not a patched-up version of the bad one.
