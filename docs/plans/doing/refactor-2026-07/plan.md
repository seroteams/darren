# Refactor programme 2026-07 — full code review → tidy

Board: https://claude.ai/code/artifact/9483ebd6-873b-4c87-848f-528467532c68 (regenerate with `node scripts/plan-board.js refactor-2026-07`, republish to this URL)

**Status: Phases 1–3 ✅ green-lit. Phase 4 ✅ built (2026-07-25), awaiting Carl's green light.**

**Current state:** P1–P3 landed (457ca20d, 12f9c627, 2c708ce6). P4 built: the /prepare layout lab is an admin-only async chunk (stage chunk 20.8 → 8.9 kB JS, CSS 1,007 → 55 lines), stage-exit CSS admin-only, boot-splash one copy, 10 dead exports gone. 183/183, all typechecks, render-proof screenshot in proof/. One planned deletion honestly skipped: runs.ts member branch is still live in the admin app.

Carl asked for a full code review to refactor (2026-07-25) and chose the **full programme** over quick-tidy. Three survey agents swept backend/, admin/+frontend/, and scripts/config. Everything here is behaviour-preserving: the app does the same thing, the code gets smaller and safer to change.

Committee note: not convened — the committee's own rules exclude refactors and already-decided calls; Carl approved the plan directly in-session.

## Ground rules (every phase)

- Behaviour-preserving only; real runtime bugs found along the way are logged for Carl, never silently fixed.
- Free checks only: `npm test`, `npm run typecheck(:admin/:customer)`, `replay-scenario --fixtures-only`, `lint:copy`, `lint:tokens`, `build:all`. Never a paid run; never import scripts/gate.js.
- One phase per session, lane claimed in LANES.md, my-own-files-only commits, no push.
- `content/questions/_runtime/` never touched.

## Phases

| # | Phase | Type | Status |
|---|-------|------|--------|
| 1 | Dead-code sweep (backend + scripts) | internal | ✅ green-lit 2026-07-25 — [phase-1.md](phase-1.md) |
| 2 | Typecheck safety net (test files + shared/) | internal | ✅ green-lit 2026-07-25 — [phase-2.md](phase-2.md) |
| 3 | server.ts guard wrappers (64 origin guards, 4 rate limiters) | internal | ✅ green-lit 2026-07-25 — [phase-3.md](phase-3.md) |
| 4 | Customer bundle: variant lab out + frontend dead code | user-visible | ✅ built — [phase-4.md](phase-4.md) — awaiting green light |
| 5 | Screen scaffold helper + state.ts | user-visible | ⬜ |
| 6 | Shared run-row projections (file vs PG store) | internal | ⬜ |
| 7 | One shared boot module for both app shells | user-visible | ⬜ |

Details per phase: [phase-2.md](phase-2.md) … [phase-7.md](phase-7.md). Minimum worthwhile programme = 1–3; every stopping point leaves the repo strictly better.

## Parked / not doing

| Item | Why |
|---|---|
| Dual pipeline orchestration + `*-inputs.ts` mirrors | Load-bearing engine-honesty machinery with parity tests. |
| Router member-rule divergence (RUN_DETAIL) | Possibly intentional product behaviour — Carl's ruling needed, not a refactor. |
| Migrating 28 scripts/test-*.js into the mirrored tree | Recorded parked debt (backend/tests/README.md); post-validation. |
| auth.controller.ts slim-down | Login-path risk outweighs validation-stage payoff. |
| Error-idiom sweep + small dedups (isUuid ×6 etc.) | Boy-scout only, in files a phase already touches. |
| scripts/lib helper extraction | Cheap but low standalone payoff now. |
| peopleProfiles dead DB table | Keep/kill is Carl's decision (shipped migration). |
| Nav-rail unification | Another session's live lane. |

## Open items logged for Carl

- **Replay baseline drift (pre-existing, not from this programme):** `replay-scenario --regression-all --fixtures-only` fails 2/6 on "styleTip is missing" — the good-prep fixtures were frozen before commit 7ecce792 added the AI styleTip requirement. Proven pre-existing (fails identically with Phase 1 stashed). Fix = re-capture baselines with `scripts/replay-capture.js` once the styleTip rule is settled.
