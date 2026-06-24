# TypeScript Conversion (Prototype → Production · Phase 003)

**Goal:** Convert the existing JavaScript engine + server to **TypeScript with tight contracts**, so
everything built after this stands on typed, checked code. **Nothing behaves differently** — this is
safety, not features.
**Driver:** Carl
**Created:** 2026-06-24
**Tracks:** the bigger plan in [../../prototype-to-production/003-typescript-conversion/00-phase-overview.md](../../prototype-to-production/003-typescript-conversion/00-phase-overview.md). When this is done + approved, update that effort's `PROGRESS.md` (Phase 003 → `done`).

## Done means
- `backend/engine/` + the server (`backend/api/`, `cli`) converted from `.js` to `.ts`, **strict mode on**.
- **Shared types** for the core shapes (session, focus point, question, axis state, briefing, evaluation)
  so modules agree on exact contracts.
- `npm run typecheck` clean (no `any` in converted code) **and** `npm test` green at every step.
- The app and CLI behave **exactly as before** — Carl walks a real run + the CLI and sees no difference.

**Out of scope (park it):** see the survey — depends on Carl's scope pick. New features, refactors,
or behaviour changes are *never* in this phase.

## The steps (DRAFT — detailed `phase-N.md` files written **after** Carl locks the picks below)
| # | Step | What it lands | Status |
|---|---|---|---|
| 1 | Lock scope + strategy (survey below) + de-risk | Carl's picks + a green proof that tests can import converted `.ts` engine modules | ✅ |
| 2 | Define shared core types | `backend/shared/` contracts — session, focus point, question, axis state, briefing, evaluation | 🔨 |
| 3 | Convert engine leaf modules (test-first) | lowest-dependency engine files → `.ts`, tests green | ⬜ |
| 4 | Convert engine core | up the dependency graph, tests green at each step | ⬜ |
| 5 | Convert the API server | `backend/api/` → `.ts` | ⬜ |
| 6 | Convert CLI + final sweep | `cli.ts`; remove stray `any`; `typecheck` clean repo-wide | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

> The step count/shape will firm up once the scope pick is locked — a backend-only scope is ~6 steps;
> adding tooling or the admin UI adds more. Writing the detailed files now would be guessing.

## Current state
**Scope locked: A (backend only).** Frontend + `scripts/` tooling parked (brief: "don't touch frontend").

**Step 1 ✅ (approved).** Strict mode confirmed *already on* (Phase 002 set it). Leaf-first order mapped
(survey below). JS↔TS import boundary proven in a scratchpad: a `.ts` module resolves only via an
**explicit `.ts` specifier**, so every importer's `'./x'` must become `'./x.ts'` when `x` converts
(including the `scripts/test-*.js` harness). CJS-require-of-`.ts` and `.ts`-import-of-CJS-`.js` both work.

**Step 2 🔨 (written — awaiting Carl's walk).** Shared core types written + green:
`backend/shared/{cost,question,briefing,session}.types.ts`. `npm run typecheck` **clean**, `npm test`
**30/30**. All four previously-unclear shapes pinned from source (notes→`handlers/notes.js`,
fingerprint→`run-fingerprint.js`, verdict→`handlers/verdict.js`, cost→`cost.js`) — **no** `any`/`as`/`@ts-ignore`.
Added `cost.types.ts` (a 4th file) because both `session.tracker` and `briefing.cost` reference it.
`Question` kept **closed** (8 fields) — for sign-off. Only `unknown`s left are two internal caches
(`lastPlanByTurn`, `inFlight`), which is legitimate.

**Next (Step 3, after green light):** convert `question-validator.js` first (true leaf + already has a
test), then `paths`, then up the order. Paid `gate` stays parked until the end-of-phase behaviour proof.

---

## Step 1 — The survey: how much, and how (for Carl's pick)

### The JavaScript surface (tracked `.js` files)
| Area | Files | What it is |
|---|---|---|
| `backend/engine/` | 63 | The AI engine — the risky, valuable core |
| `backend/api/` | 37 | The server |
| `backend/cli.js` | 1 | The CLI |
| `scripts/` | ~69 | Test harness (~38 `test-*.js`) + tooling (gate, eval, replay, etc.) |
| `admin/src/` | 46 | The existing console UI |

### Decision 1 — **Scope: how much do we convert in Phase 003?**

| Option | What it converts | Verdict |
|---|---|---|
| **A — Backend only** *(recommended)* | `engine` + `api` + `cli` = **101 files**. Each module's test converts alongside it (test-first). | ✅ Matches the brief ("the engine and server"). Keeps the phase focused on the risky core. admin UI + standalone tooling parked. |
| B — Backend + tooling | A, **plus** the ~69 `scripts/` (test harness + gate/eval/replay tools). | ⏸️ More complete, but bigger. Tooling benefits from types far less than product code; can be a later cleanup. |
| C — Whole repo now | B, **plus** the 46 `admin/src` UI files. | ❌ Most complete, but **Phase 007 (frontend app)** revisits the UI — converting it now risks double work. |

**Recommendation: A.** It's exactly what the brief scopes, and it puts full attention on the engine
(where a silent type bug actually costs us). Tooling and admin convert in their natural later phases.

### Decision 2 — **Strategy** (recommended, not really a fork — flag if you disagree)
- **Leaf-first up the dependency graph:** define shared types → convert lowest-dependency modules → work
  up to the core → api → cli. `npm test` stays green at *every* step (the brief: behaves identically).
- **Strict from day one, no `any`** (the brief's rule). Any genuinely unavoidable loose spot gets
  **logged in Parked**, never silently `any`-ed or `@ts-ignore`-d (engine-honesty rule).
- **Test-first:** where a module has no test, add a characterising test first (red), then convert (green).

### A risk to kill in step 1 (before committing to a path)
Our existing tests are `.js` (run by `scripts/run-tests.js`). When an engine module becomes `.ts`, can a
`.js` test still import it under Node's native TS support — or do we convert each test in lockstep with
its module? **Step 1 proves this with one tiny conversion before we commit to the approach.** (The
Phase 002 `clamp.ts` proof suggests it's fine, but a `.js`→`.ts` import is the specific thing to confirm.)

---

### The pick — ⬜ AWAITING CARL
Pick a scope (A / B / C) and say whether the strategy looks right. Then I write the detailed
`phase-N.md` files (each ending in owner test scenarios) and we run step 1 — **after** you confirm.

## Parked
- Converting `admin/src` UI → with **Phase 007 (frontend app)**, unless pulled into scope here.
- Converting `scripts/` tooling → a later cleanup, unless pulled into scope here.
- The 1 pre-existing npm high-severity advisory (flagged in Phase 002) → `npm audit fix` is unrelated.
