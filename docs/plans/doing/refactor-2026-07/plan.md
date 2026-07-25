# Refactor programme 2026-07 — full code review → tidy

Board: https://claude.ai/code/artifact/9483ebd6-873b-4c87-848f-528467532c68 (regenerate with `node scripts/plan-board.js refactor-2026-07`, republish to this URL)

**Status: Phases 1–4 ✅ green-lit. Phase 5 ✅ built (2026-07-25), awaiting Carl's green light.**

**Current state:** P1–P4 landed. P5 built in two commits: state.js + drifted state.d.ts → one typed state.ts (f38f9c19, 67 imports repointed); screen-scaffold helper adopted — every customer loading state is now the standard ghost cards, five admin "Loading…" sentences gone, six error cards standardised with their exact copy. 183/183, all typechecks, render proof in proof/. Remainder recorded: six admin error-card markups (mechanical).

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
| 4 | Customer bundle: variant lab out + frontend dead code | user-visible | ✅ green-lit 2026-07-25 — [phase-4.md](phase-4.md) |
| 5 | Screen scaffold helper + state.ts | user-visible | ✅ built — [phase-5.md](phase-5.md) — awaiting green light |
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
