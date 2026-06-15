# Phase 2 — Inject into all 5 stages

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built — awaiting owner QA. Check command: `node scripts/check-role-profile-injection.js`

## Goal
Every stage prompt carries the role-profile block (right-sized per stage), with a safe fallback when no profile exists.

## Changes
- Add `{{ROLE_PROFILE_BLOCK}}` to the 5 templates: `prompts/generate-focus-points.md`, `prompts/preparation.md`, `prompts/generate-questions.md` (after the lexicon block, with "curated term guidance takes precedence"), `prompts/plan-turn.md`, `prompts/final-evaluation.md`.
- In `src/generate.js`, `src/preparation.js`, `src/question-generator.js`, `src/queue-manager.js`, `src/reviewer.js`: load the profile, substitute the block (slice per the plan: slim for focus points + planner, full for prep + bank, eval slice for the brief), and log `roleProfile: {key, status}` into stage inputs.
- Add the new prompt to `smoke-test.js` `PROMPT_SRC_MAP` so placeholder coverage is enforced.

## Not in this phase
- No automatic generation at intake (Phase 3) — the profile must already be on disk (from Phase 1's demo script).
- No new gates (Phase 4).

## Done when
- [ ] With a profile on disk, every stage's rendered prompt contains the role context (per-stage slice).
- [ ] With no profile on disk, every stage renders the fallback line — no crash, no unresolved-placeholder error.
- [ ] Bi-weekly / feels-off prompts contain no competency-tagged profile items.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Block appears** — with the Phase-1 SRE profile on disk, run the check command we'll provide (renders each stage prompt offline). Each of the 5 prompts should show a role-context section mentioning SRE-specific content. ❌ Not OK if any stage misses it.
2. **No profile, no breakage** — temporarily rename `data/role-profiles/` and rerun. Every prompt should show "(no role profile available …)" and nothing errors.
3. **Bi-weekly stays safe** — render the bi-weekly version. Items tagged as competency must NOT appear. ❌ Not OK if performance-flavoured items show up in a bi-weekly prompt.
4. **Smoke unit checks** — `npm run smoke` pre-API section passes.
