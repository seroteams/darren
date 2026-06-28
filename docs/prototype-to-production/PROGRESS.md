# Progress Log — Prototype → Production

> **This is the living log for the migration.** The AI agent updates it after every action.
> The fixed playbook is **[OVERVIEW.md](OVERVIEW.md)**; this file is the part that changes.
> Carl: you don't edit this — just say "what next?" and the agent reads and updates it.

---

## Where we are now
- **Active phase:** 005 — Postgres foundation
- **Status:** `planned` — folder scaffolded; **building gated on one decision: Carl picks Drizzle vs Prisma.**
- **Last updated:** 2026-06-28 (Phase 004 signed off & closed out today)

## Next up (this can change as we learn)
**One decision unblocks the build: Carl picks the migration tool** — **Drizzle (recommended)** vs Prisma —
the comparison is in [../todo/postgres-foundation/PLAN.md](../todo/postgres-foundation/PLAN.md). On the
pick: I log it, write the detailed `phase-2/3/4.md` step files, run the free baseline (`npm test`), and
start **Phase 2 (first migration)**. *(Phase 004's repo-seam gate is now satisfied — it's `done`, so the
05 build is clear the moment the tool is chosen.)*

## Phase status
| # | Phase | Status |
|---|---|---|
| 001 | Monorepo reorg | `done` |
| 002 | Conventions & skills | `done` |
| 003 | TypeScript conversion | `done` |
| 004 | Backend API v1 (RESTful, TDD) | `done` |
| 005 | Postgres foundation | `planned` (active — awaiting tool pick) |
| 006 | Auth (org model, password, SSO-ready) | `not-started` |
| 007 | Frontend app | `not-started` |
| 008 | Security | `not-started` |

Status flow: `not-started` → `planned` → `in-progress` → `awaiting-qa` → `done`.

## Decisions made (append-only)
- **2026-06-19** — Locked the shape decisions: AI engine lives in `backend/engine/`; existing UI →
  root `admin/` console; new root-level `frontend/` is the customer app; repos co-located with services;
  Postgres in scope for **organisations + users + sessions** (heavy per-run logs stay as files on disk, indexed by id).
- **2026-06-19** — Locked the standing engineering standards: **TypeScript + tight contracts**;
  **TDD red→green** as law (obra/superpowers skill); tests **mirror the system** (not flat); kebab-case
  file names with role suffix + shallow inheritance (interfaces over deep class trees); **RESTful,
  versioned `/api/v1/`** API; Postgres conventions (`uuid` keys, `snake_case` plural tables,
  `timestamptz`, `jsonb` not `text`, versioned migration files); **multi-tenant org model**
  (signup creates an org, basic roles, invites scaffolded for later); **SSO-ready** auth (identity
  decoupled from credentials); **security/PII + AI-key protection + required human-expert review**.
- **2026-06-19** — TypeScript conversion gets its **own phase (003)**, after conventions (002) and
  before the backend scaffold (004), so everything built afterward stands on typed code.
- **2026-06-24** — **Phase 002 borrow-vs-build → Option 1.** Borrow TDD (`obra/superpowers/
  test-driven-development`) + one general security skill (`getsentry/skills` → `security-review`);
  park Trail of Bits for Phase 008; build `backend-conventions` + `frontend-conventions` ourselves.

## Parked (good ideas — not now)
- Teammate invitations as a full feature (resend / sent-at / expires-at flows). DB + code are
  **scaffolded** for it in Phases 005–006; the feature itself is later.
- SSO (Google / Microsoft) sign-in. Structure is designed for it in Phase 006; the integration is later.

## Activity log (newest first)
- **2026-06-28** — **Phase 004 (Backend API v1) → `done` & SIGNED OFF.** Carl owner-walked and approved
  ("approved!"). Close-out done: steps 3 & 4 → ✅ in
  [../todo/done/backend-api-v1/PLAN.md](../todo/done/backend-api-v1/PLAN.md); build-plan badge
  (`admin/src/stages/tasks.js`) Phase 004 → ✅ Built (steps 3 & 4 `s:"done"`); folder moved to
  `docs/todo/done/backend-api-v1/`. **Phase 005 is now the active phase.** Approved on the **free**
  owner-walk — no paid gate run was triggered, so the **$3 budget is untouched**. The full backend is now
  controller → service → repo under `/api/v1/`, file-backed behind a swappable repo seam — exactly what
  Phase 005 swaps to Postgres.
- **2026-06-28** — **Phase 005 (Postgres foundation) → `planned` (build gated).** At Carl's request
  ("go for 005"), scaffolded the Darren working folder
  [../todo/postgres-foundation/PLAN.md](../todo/postgres-foundation/PLAN.md) + `phase-1.md` (the
  tool-choice decision step). Phase 1 writes up the gating decision — **Drizzle (recommended) vs
  Prisma** — with a tailored comparison; phases 2–4 are outlined, detail to be written once the tool is
  locked (same rhythm as 004's D1–D5). **Flagged pace drift:** 005 rewrites 004's repo seam, so **no
  005 code lands until Carl approves Phase 004.** Planning was $0 — no paid run. Also corrected the
  stale Phase-004 status here (`not-started` → `awaiting-qa`; it's been built + committed since 06-28).
- **2026-06-24** — **Phase 003 (TypeScript conversion) → `planned`.** Re-verified Phase 002 (free
  checks: `npm test` 30/30, `typecheck` clean, offline replay green; 4 skills load, links resolve,
  `clamp` proof 3/3) — Carl gave a complete sign-off. Set up the Phase 003 plan folder
  [../todo/typescript-conversion/PLAN.md](../todo/typescript-conversion/PLAN.md) with the JS surface
  (engine 63 / api 37 / cli 1 = 101 backend files; +69 scripts; +46 admin) and a scope survey
  (A backend-only *recommended* / B +tooling / C +admin) + strategy (leaf-first, strict, test-first).
  Awaiting Carl's scope pick before detailed step files + step 1.
- **2026-06-24** — **Phase 002 (Conventions & skills) → `done` & SIGNED OFF.** Carl walked the QA
  (CLAUDE.md §7 surfaces the right rulebook for backend vs frontend) and gave the go. Shipped: TDD +
  security-review skills installed, `backend-conventions` + `frontend-conventions` written, strict
  TypeScript rails + mirrored test layout, CLAUDE.md wired, and a test-first proof (`clamp`) in
  correctly-named files. Verified: 4 skills load, typecheck clean, 8/8 links resolve, `npm test` 30/30.
  Folder moved to `docs/todo/done/convention-skills/`. Phase 003 (TypeScript conversion) is next.
- **2026-06-24** — **Phase 002 step 5 — rules wired + proof landed (Phase → awaiting-qa).** `CLAUDE.md`
  §7 maps work → rulebook (backend/frontend/feature/security); all 4 links resolve. Test-first proof:
  `backend/shared/clamp.ts` + co-located `clamp.test.ts` (named per backend rulebook), red→green, 3/3.
  Finished TS tooling (`@types/node`, `types:["node"]`, `allowImportingTsExtensions`); `npm run
  typecheck` clean repo-wide. Guide links 8/8 resolve; `npm test` 30/30. Step 4 committed `5874347c`.
- **2026-06-24** — **Phase 002 step 4 — TS safety rails laid (awaiting Carl's QA).** Added strict
  `tsconfig.json` (`noEmit`, `allowJs:false` — existing JS untouched; conversion is Phase 003),
  `typecheck` script + `typescript@^6` dev-dep, and the mirrored `tests/` skeleton
  (`README` + `integration/` + `e2e/`). Strict proven on a throwaway file (caught implicit-any +
  null-assign; passed clean code). Repo `typecheck` says "no inputs" until step 5's first `.ts`.
  Lint exit 0 (6 pre-existing warnings); `npm test` 30/30. 1 pre-existing npm advisory left for Carl.
  Step 3 committed `6d2694f`.
- **2026-06-24** — **Phase 002 step 3 — two rulebooks written (awaiting Carl's QA).** Hand-authored
  `backend-conventions` + `frontend-conventions` skills in `.claude/skills/` from the locked
  conventions (no new rules invented). Both load (`npx skills ls` lists them; both surfaced
  in-session). Step 2 committed `913cca2` after Carl's go.
- **2026-06-24** — **Phase 002 step 2 — skills installed (awaiting Carl's QA).** Installed into
  `.claude/skills/`: `test-driven-development` (obra/superpowers, MIT) and `security-review`
  (getsentry, CC BY-SA 4.0 / OWASP). Read both SKILL.md + confirmed licences first. Both in
  `skills-lock.json`; `npx skills ls` lists both; TDD skill surfaced as available in-session. Removed
  installer spillover (`.kiro/`, `.agents/`). `npm test` 30/30. Not committed until Carl's QA.
- **2026-06-24** — **Phase 002 broken into 5 steps; step 1 (borrow-vs-build survey) written.**
  Researched skills.sh / GitHub. Recommendation written into
  [../todo/done/convention-skills/PLAN.md](../todo/done/convention-skills/PLAN.md): borrow **TDD**
  (`obra/superpowers/test-driven-development`) + one general **security** skill
  (`getsentry/skills` → `security-review`), park **Trail of Bits** for Phase 008, and **build**
  our two rulebooks (`backend-conventions` + `frontend-conventions`). Nothing installed — awaiting
  Carl's pick (Option 1/2/3). Baseline before work: `npm test` 30/30 (free/offline).
- **2026-06-24** — **Phase 001 (Monorepo reorg) → `done`.** Files moved into five rooms
  (`backend` `admin` `frontend` `content` `docs`) + address book `backend/engine/paths.js`
  (25 engine files read locations from it). Verified: `npm test` 30/30 (= pre-move baseline),
  offline replay clean, tree + paths correct, no stale root references. Owner walked the app +
  CLI and signed off. Removed an empty leftover root `lexicons/` folder (untracked debris; the
  real one is `content/lexicons/`). Plan folder moved to `docs/todo/done/monorepo-reorg/`.
- **2026-06-19** — Reworked the plan to 8 phases: added **003 TypeScript conversion** and **008 Security**,
  renumbered backend/DB/auth/frontend accordingly, and folded in the new standards (TypeScript, TDD,
  RESTful `/api/v1/`, DB conventions + migrations, org/multi-tenant model, SSO-ready auth). Updated
  OVERVIEW and every phase overview.
- **2026-06-19** — Set up `docs/prototype-to-production/`: `OVERVIEW.md` (orchestrator + map) and a
  `00-phase-overview.md` for each phase, and initialised this `PROGRESS.md`.
