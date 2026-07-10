# Plan-turn slim — restore the prompt-cache discount

**Goal:** Every plan-turn prompt fits under ~9.3k tokens so OpenAI's cache discount applies again — a full run costs ~$0.15 instead of ~$0.38, with planner quality unchanged. (Cliff pinned by probe 2026-07-10: caches at 9,502, dead at 9,795; 9,300 leaves headroom.)
**Driver:** Carl
**Created:** 2026-07-10

## Done means
- Every turn's plan-turn prompt measures ≤9.3k tokens (real tokenizer, all logged scenarios).
- A live run shows `cached_tokens > 0` on plan-turn calls 2+ in `cost.json`, and run total ≈ $0.15.
- Planner behavior holds: gate case passes, and a side-by-side run review shows no quality drop.

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
| 3 | Live proof | One paid run: caching back, cost ~$0.15, quality reviewed side-by-side | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phases 1 & 2 GREEN-LIT by Carl 2026-07-10; phase 3 (live proof) now in progress.** Cliff pinned by probe (~9,600). Slim landed: worst filled prompt **13,739 → 9,186 tok**, under the 9,300 target with headroom; every rule preserved; `npm test` 109/109, typecheck clean, placeholders identical to HEAD. Committed path-scoped. **Next (phase 3):** capture a pre-slim baseline run of one scenario (free), then one paid pipeline run (~$0.35) to confirm cache hits in cost.json, ~$0.15 total, and quality holds side-by-side. Files: content/prompts/plan-turn.md, backend/engine/messages.ts, scripts/plan-turn-size-report.js.

## Parked
- prep-retry fires on 64 of 65 runs — `validateBrief` almost always rejects attempt 1; worth its own look (~$0.017/run leak, and a validator that always fails is really a prompt bug).
- Flex/batch service tier for offline QA runs (gate, night-test) — 50% off with no quality change; independent of this plan.
- Planner → gpt-5.4-mini trial — fallback if slimming can't hit the target without hurting quality.
- content/data/openai-models.json pricing refresh (last fetched 2026-05-27).
