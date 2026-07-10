# Plan-turn slim — restore the prompt-cache discount

**Goal:** Every plan-turn prompt fits under ~9.3k tokens so OpenAI's cache discount applies again — a full run costs ~$0.15 instead of ~$0.38, with planner quality unchanged. (Cliff pinned by probe 2026-07-10: caches at 9,502, dead at 9,795; 9,300 leaves headroom.)
**Driver:** Carl
**Created:** 2026-07-10

## Done means (outcome recorded at close 2026-07-10)
- ✅ Every turn's plan-turn prompt ≤9.3k tokens (worst 9,186).
- ❌ `cached_tokens > 0` / run ≈ $0.15 — **NOT achieved.** Real run cached 0 (OpenAI no longer credits shared prefixes for gpt-5.4; only near-exact repeats cache). Run landed at $0.29, not $0.15.
- ✅ Quality holds — real run produced a valid briefing, all 9 turns scored deltas; every rule preserved.
- **Net:** ~24% cheaper ($0.38→$0.29) from smaller prompts alone. Real and permanent, but not the caching-driven halving originally hoped. Closed honestly on that basis.

## Resolved before we start
- **Why this works (probed live 2026-07-10, ~$0.25):** OpenAI stopped caching gpt-5.4 prompts somewhere above ~8.7k tokens around June 12 (log scan: 99% cache at 10–12k before, 0/173 calls ≥10k after; probe: identical 13k requests 3s apart never cache, but an ~8.7k request caches 97%). Not caused by our code — the `grounding` schema field and `prompt_cache_key` were both tested and ruled out.
- **One template to slim:** all 5 meeting types share [content/prompts/plan-turn.md](../../../../content/prompts/plan-turn.md) (no per-type overrides).
- **Where the tokens are:** ~10.9k tokens of standing instructions vs ~0.5k of data scaffolding (session data adds ~2–3k filled). Biggest blocks: `decision_order`-region ~3.0k, `assessment_rules` ~2.3k, `planning_rules` ~2.1k, `question_craft` ~1.8k.
- **Safest cuts exist:** many prompt rules are *also* enforced in code after the model answers (drill cap, closer-on-final-turn, budget length, thread-follow, axis coverage, grounding gate, dedup — all in queue-manager.ts / reconcile-queue.ts). Instruction text for code-enforced invariants can be compressed with a safety net already in place.
- **Offline verification is possible:** `assemblePlanTurn` (queue-manager.ts) builds the byte-exact prompt without calling the model, and logged runs provide real inputs. No tokenizer is installed — phase 1 adds `gpt-tokenizer` as a devDependency for exact counts.
- **Target has margin:** cutoff is somewhere in 8.7k–10k; we aim ≤8.5k so growth (long transcripts, big role profiles) doesn't creep back over.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Token map + cut list | Exact per-turn token measurements and a per-cut proposal table Carl approves | ✅ |
| 2 | The rewrite | Slimmed plan-turn.md hitting ≤9.3k on every logged scenario, tests green | ✅ |
| 3 | Live proof | Real run: $0.29 (was $0.38, ~24% cheaper), quality intact; caching NOT restorable | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**✅ TRACK CLOSED 2026-07-10 — banked the ~24% saving; moved to done/.** Real run: $0.2887 (was ~$0.38), quality intact. Caching not restorable (OpenAI-side; only near-exact repeats cache now). Code committed f46c7824. Bigger levers left parked (gpt-5.4-mini planner; flex tier for QA).

_History:_
**Phases 1 & 2 GREEN-LIT by Carl 2026-07-10.** Cliff pinned by probe (~9,600). Slim landed: worst filled prompt **13,739 → 9,186 tok**, under the 9,300 target with headroom; every rule preserved; `npm test` 109/109, typecheck clean, placeholders identical to HEAD. Committed path-scoped. **Phase 3 (2026-07-10) — real run, honest result:** ran one full pipeline live ($0.2887 total, was ~$0.38; valid briefing + all 9 turns scored → quality intact). **⚠️ Correction:** caching did NOT re-engage — every plan-turn call `cached=0`. My earlier "~$0.16 / caching restored" was wrong; it rested on an exact-repeat probe. Real turns share a ~7,900-tok prefix but OpenAI no longer credits shared prefixes for gpt-5.4 (only near-exact repeats), so caching won't return via slimming at any size. **Real value: ~24% cheaper ($0.38→$0.29) from smaller prompts alone — permanent, committed, quality intact.** Bigger levers parked: planner→gpt-5.4-mini, or flex tier for QA. Files: content/prompts/plan-turn.md, backend/engine/messages.ts, scripts/plan-turn-size-report.js.

## Parked
- prep-retry fires on 64 of 65 runs — `validateBrief` almost always rejects attempt 1; worth its own look (~$0.017/run leak, and a validator that always fails is really a prompt bug).
- Flex/batch service tier for offline QA runs (gate, night-test) — 50% off with no quality change; independent of this plan.
- Planner → gpt-5.4-mini trial — fallback if slimming can't hit the target without hurting quality.
- content/data/openai-models.json pricing refresh (last fetched 2026-05-27).
