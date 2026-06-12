# Phase 4 — Next-stage implementation spec

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A short spec at `docs/todo/next-stage/PLAN.md` a coding session could start from cold — the 8-phase build order corrected against what already exists.

## Changes
- New `docs/todo/next-stage/PLAN.md` (overview only; phase files get written when the build actually starts, after Now clears):
  1. **Contracts** — document (don't rebuild) existing per-stage schemas/enums in one boundaries doc; tighten where loose. Reuses `RESPONSE_SCHEMA`s in `src/generate.js`, `src/reviewer.js`, `src/role-profile.js`, `src/axes.js`.
  2. **Persistence / session continuity** — the genuinely new build: save web session stages early (file-based under `logs/`, consistent with `src/session.js` + `frontend/server/session-persistence.js`; no DB yet), recovery for partial runs, access rules.
  3. **Deterministic fallback** — fill the one hole: briefing-generation failure path (question/role-profile/closer fallbacks already exist). Flag failures, never mask.
  4. **Issue pills + observed shift** — structured intake on top of free-text notes (`frontend/client/src/stages/intake.js`, `frontend/server/handlers/notes.js`).
  5–8. **Prep quality / prep timeline UI / live runner / summary** — improvement phases on existing stages, one screen-list line each; no new dashboards or settings.
- Each spec phase: scope, files touched, done-when.

## Not in this phase
- No build work. The whole spec — including issue pills — sits under **Next** on the board; nothing starts while Now isn't green.

## Done when
- [ ] Spec exists, every phase names the existing files it builds on.
- [ ] Product owner has tested the scenarios below and said go.
- [ ] Green light → docs-only commit: `git add docs/todo/next-stage/PLAN.md docs/todo/cleanup-board/`

## Test scenarios — for the product owner
1. **Cold start** — read spec phase 1 as if you were a fresh coding session. Could you start without asking a question? ❌ Not OK if you'd need this chat's context.
2. **Builds on, not rebuilds** — phases 1–3 each name existing files they extend. ❌ Not OK if anything proposes rewriting a stage that already works.
3. **No creep** — search the spec for dashboards, analytics, benchmarking, person-profiles/persona pages: zero hits (role-aware prep via role-profiles is fine).
