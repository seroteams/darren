# Phase 1 — Engine + prompt (the tip content)

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-20 — Carl approved the tip quality off 3 live tips (bi-weekly / feels-off / growth), all on-style + arc-clean

## Built (2026-07-20)
- `styleTip` field added: prompt output-contract + field rule + relational-arc gate line (`content/prompts/preparation.md`); schema/required + coercePrepBrief + validateBrief clause (`backend/engine/preparation.ts`); type (`backend/shared/session.types.ts`); CLI render (`backend/engine/cli/stages/preparation.ts`); test fixtures + 3 new clause tests (`backend/engine/preparation.test.ts`, `scripts/test-prep-wording.js`).
- Offline proof: `npm run typecheck` clean · `npm test` 164/164.
- Live proof (one paid run, ~3 prep calls): real tips generated for bi-weekly / feels-off / growth — all on-style, none an echo, styleTip validator clean. Bi-weekly with a deliberate "quality slipped" note stayed relational ("mapping friction with her, not building a case") — arc gate held.

## Goal
The preparation model generates a `styleTip` on every brief: short, on-style, situation-aware, guarded like the other 8 fields.

## Changes
- `content/prompts/preparation.md` — add `styleTip` to the output-contract JSON, a field rule, and the relational-arc gate line.
- `backend/shared/session.types.ts` — add `styleTip: string` to `PreparationResult.brief`.
- `backend/engine/preparation.ts` — `coercePrepBrief` field, `RESPONSE_SCHEMA` property + `required`, a `validateBrief` clause (length + no-echo).
- `backend/engine/cli/stages/preparation.ts` — print `styleTip` in the CLI brief (so QA runs show it).
- `backend/engine/preparation.test.ts` — add `styleTip` to the fixture; add a clause test.

## Not in this phase
- Any frontend / on-screen render (that's Phase 2).

## Done when
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green, including a new styleTip validator test.
- [ ] ONE small paid gate case produces a real, on-style `styleTip` (read from the stage log) with no arc leak — shown to Carl.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Bi-weekly tip** — I run one small paid gate case for a bi-weekly. You should see a `styleTip` that reads like "keep it a light rhythm-keeper, not a review" tuned to the notes — ❌ not OK if it reads like a performance review or names a competency.
2. **On-style, not an echo** — the tip should be about *how to run the meeting*, clearly different from the "core issue" line. ❌ Not OK if it just repeats the core issue.
3. **Free checks** — I show you typecheck clean + `npm test` green, with the new styleTip test passing.
