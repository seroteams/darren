# Phase 2 — Fix the stale agent maps

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested) · **Run order:** 1st (do this first)

## ✅ GREEN-LIT 2026-07-08 — Carl walked the 3 scenarios (commit `2a67ec93`; hash stamped in the follow-up tracker commit)

## Built (2026-07-08)
- **`.cursor/rules/sero-engine-handover.mdc`** — rewritten as a thin, durable orientation: real map table (engine in `backend/engine/`, the two orchestrators, gates, prompts), always-apply rules (read CLAUDE.md first, trackers, cost, honesty, TS+TDD), current npm scripts. Deliberately holds no point-in-time state — that's what rotted last time.
- **`docs/reference/engine-map.md`** — new one-pager: 5 stages + entry fn/file/log-folder table, the `callAI` seam, the lockstep warning for both orchestrators, what "correct" means (gates + golden cases), the 5 couplings that bite, cheapest-first verification ladder.
- **18 stale comment references fixed** (comment-only, no code): `backend/shared/session.types.ts` (4), `question.types.ts` (4), `briefing.types.ts` (2), `backend/engine/briefing.ts`, `delta-gates.ts` (2), `question-generator.ts`, `role-profile.ts`, `relational-arcs.ts`, `reviewer.ts` (also corrected a wrong pointer: `isShallowAnswer` lives in `delta-gates.ts`, not queue-manager), `one-on-one-types/index.ts`, `backend/api/services/sessions/session-streams.ts` (2).
- **Offline proof:** stale-grep across `backend/` + `.cursor/` = 0 hits; `npm test` 92/92 ✅ and typecheck ✅ re-run after the edits (baseline was also green; lint's 44 problems are pre-existing, see plan.md).

## Goal
A fresh agent loads one accurate map of the engine — no dead `src/` layout, no `.js` filenames that no longer exist.

## Why
`.cursor/rules/sero-engine-handover.mdc` is `alwaysApply: true` and describes the pre-monorepo world: engine in `src/`, `cli.js`, all `.js`, "PR #1 blockers", dated 2026-06-02. Any Cursor agent auto-loads it and gets a materially wrong map. Engine comments still cite `.js` files that were renamed to `.ts`, so grep-based navigation misleads. This is cheap (hours) and unblocks every other phase.

## Changes
- **`.cursor/rules/sero-engine-handover.mdc`** — rewrite to reality (engine in `backend/engine/`, facade `backend/engine/index.ts`, the two orchestrators, the gate, current npm scripts, today's tracker model), **or** delete it and replace with a thin pointer to `CLAUDE.md` + `docs/reference/`.
- **Engine/shared comments** — sweep stale `.js` → `.ts` filename references (e.g. in `backend/shared/session.types.ts`). Comment-only edits, low risk.
- **`docs/reference/engine-map.md`** (new) — the single "read before any engine change" page: the 5 stages + entry fn/file, the `index.ts` facade, the two orchestrators (and that they move in lockstep), the gate (`evals/trust-checks.ts` + `golden-checks.ts`), and "correct = gate passes on ratified golden cases."

## Not in this phase
- The parity *test* between the two orchestrators (that's Phase 4) — here we only document that both exist.

## Done when
- [ ] Grep for `src/`, `cli.js`, `\.js"` across `.cursor/` and engine comment maps returns nothing stale.
- [ ] `docs/reference/engine-map.md` exists and names all 5 stages + their real files.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. Next phase waits for your green light.
1. **The map is true** — open `.cursor/rules/sero-engine-handover.mdc` (or its replacement). Every path it names should exist. ❌ Not OK if it still says `src/`, `cli.js`, or points at deleted files.
2. **One-page orientation** — open `docs/reference/engine-map.md`. From it alone you should be able to point at where each of the 5 stages lives and what "correct" means. ❌ Not OK if a stage or the gate is missing.
3. **No stale grep hits** — search the repo for `src/generate.js` (and a couple of other old `.js` names). Should be zero hits in agent-facing docs/comments.
