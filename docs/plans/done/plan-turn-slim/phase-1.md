# Phase 1 — Token map + cut list

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10 — token map + cut list accepted (with phase 2, commit below)

## Built (2026-07-10)
- Added `gpt-tokenizer` devDependency (offline; o200k_base matches real billed `prompt_tokens` within 1.8%).
- New free script [scripts/plan-turn-size-report.js](../../../../scripts/plan-turn-size-report.js) — per-section + per-turn token map across 3 real scenarios (bi-weekly, feels-off, performance). No API.
- Verified in code which rules have a net (Grep of queue-manager.ts / reconcile-queue.ts / delta-gates.ts / axis-coverage.ts).

### The map (o200k_base tokens)
Fixed instruction block (System) = **9,823 tok**, repeated every turn. Live data (User) = 2,615–3,747 tok. Worst filled prompt = **13,739**; target ≤ 9,300 → must remove **~4,440**.

| System section | Tokens | Net in code? |
|---|---|---|
| assessment_rules | 2,207 | **Partial** — shallow gate, misalignment, clarity-damper, magnitude clamp all coded; *classification/valence logic is prompt-only* |
| planning_rules | 2,079 | **Mostly** — budget, coverage, drill-cap, closer, thread-follow all coded; *wellbeing-cap, off-arc-cap, snap-back, commitment, urgency are prompt-only* |
| question_craft | 1,579 | **No** — question phrasing quality is prompt-only (weak/sharp table, principles) |
| thread_follow_rule | 991 | **Partial** — presence + drill-cap coded; examples/bias prose is prompt-only |
| output_contract | 509 | Keep — defines the JSON shape |
| worked_examples | 395 | No — illustrative |
| wind_down_rule | 372 | Partial — final-turn/budget coded; taper wording prompt-only |
| rules | 357 | **Partial** — relational-arc competency gate coded; rest prompt-only |
| no_inference_rules · crisis_override · closer_craft · dedup_rules · decision_order · persona | ~1,130 | Mixed — **crisis_override KEEP (safety)** |

### Code nets confirmed (safe to compress the matching prose — behavior keeps its net)
`clampToSignature`, `applyShallowGate`, `applyMisalignmentClarity`, `applyRecurringGapClarityDamper` (delta-gates.ts) · `enforceThreadFollow`, `enforceDrillCap`, `enforceAxisCoverage`, `enforceCloserOnFinalTurn`, `enforceBudgetLength` (queue-manager.ts) · grounding gate + relational-arc competency drop (reconcile-queue.ts) · dedup via `isRepeatOfAsked`.

### Prompt-only — DO NOT cut the rule, only tighten wording (no net if removed)
Answer classification/valence, deficiency-as-request, **wellbeing-clarifier cap**, **off-arc-tangent cap**, snap-back, honor-commitments, context-aware urgency, closer craft, all of question_craft, worked examples, crisis_override.

### Feasibility (finding — RESOLVED by probe 2026-07-10)
Cliff now pinned: gpt-5.4 **caches at 9,502 tok, dead at 9,795** → cutoff ≈ 9,600. Target set to **9,300** (headroom). Worst filled prompt 13,739 → must remove **~4,440**. A quality-safe pass — consolidating rules stated 2–3× across `decision_order`/`thread_follow`/`planning`/`wind_down`/`question_craft`, compressing the code-netted prose, trimming one worked example and a couple of weak/sharp rows — realistically frees **~3,000–3,900 tok** from instructions; JSON-compacting the User block (single-line, a small messages.ts change) frees **~450 tok** more. Combined **~3,450–4,350** now brackets the ~4,440 needed — achievable with quality intact, where before (8,500 target) it wasn't. The messages.ts JSON compaction is the one scope addition beyond template edits; folded into phase 2.

---

## Goal
Know exactly where every token goes and agree the specific cuts before touching the prompt.

## Changes
- Add `gpt-tokenizer` as a devDependency (offline, exact GPT token counts — no API).
- New script `scripts/plan-turn-size-report.js`: assembles the plan-turn prompt for every turn of 2–3 logged scenarios (via `assemblePlanTurn` + logged run inputs) and prints a per-turn, per-section token table. Free — no API calls.
- A **cut-list table** added to this file: every proposed cut/compression, its token saving, and — for each — whether a code gate already enforces the same rule (file + function named), or why it's safe to compress.

## Not in this phase
- No edits to plan-turn.md itself. Measurement and proposal only.
- No paid runs.

## Done when
- [ ] Size report runs and shows the real per-turn totals (expect ~13k) and per-section splits.
- [ ] Cut list totals at least 4.5k tokens of savings, with a safety note per cut.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Size report** — run `node scripts/plan-turn-size-report.js`. You should see a table: each turn of each scenario with its token count (~13k) and the biggest sections named. ❌ Not OK if it needs an API key or costs money.
2. **Cut list sanity** — read the cut-list table in this file. Every row should say in plain words what the model would no longer be told, and what still protects that behavior (usually "the engine enforces this in code after the model answers, in <file>"). ❌ Not OK if a cut just says "shorten this" with no safety story.
3. **The math works** — the savings column should add up to ≥4.5k tokens, landing the prompt ≤9.3k. If it doesn't add up, the phase isn't done.
