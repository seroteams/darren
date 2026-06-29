# Progress Log — Prototype → Production

> **This is the living log for the migration.** The AI agent updates it after every action.
> The fixed playbook is **[OVERVIEW.md](OVERVIEW.md)**; this file is the part that changes.
> Carl: you don't edit this — just say "what next?" and the agent reads and updates it.

---

## Where we are now
- **Active phase:** 007 — Frontend app / login screen (next, not started). **006 (Auth) is `done`.**
- **Status:** **Phase 006 ✅ DONE & SIGNED OFF.** Register/login with bcrypt-hashed passwords (raw never
  stored), session cookie + a guard that refuses logged-out access to protected pages, a hard-gated
  `DEV_AUTOLOGIN` side-door (sealed in prod), and signup that creates the org + first-user-owner with
  every query fenced to the caller's company. Closed out to `docs/todo/done/auth-front-door/`.
- **Free checks:** `npm test` **49/49** green · `npm run typecheck` clean (offline, $0). `main` in sync
  with origin.
- **Last updated:** 2026-06-29

## Next up (this can change as we learn)
**Phase 007 — the customer app.** The back-end front door (006) is done, but there's still **no login
*screen*** — the admin console at localhost:3000 doesn't ask you to log in yet. 007 stands up the
customer-facing app (register/login screens wired to the secure backend) while the current screens stay
as the internal admin tool. Two open scopes to pick from before starting: full Phase 007 vs the
**planner-grounding** engine track ([../todo/planner-grounding/PLAN.md](../todo/planner-grounding/PLAN.md)).
One phase at a time; Carl green-lights before the next.

## Phase status
| # | Phase | Status |
|---|---|---|
| 001 | Monorepo reorg | `done` |
| 002 | Conventions & skills | `done` |
| 003 | TypeScript conversion | `done` |
| 004 | Backend API v1 (RESTful, TDD) | `done` |
| 005 | Postgres foundation | `done` |
| 006 | Auth (org model, password, SSO-ready) | `done` |
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
- **2026-06-28** — **Phase 005 migration tool = Drizzle** (chosen by Carl). Over Prisma because the schema
  is plain TypeScript (one language, no separate DSL), it's SQL-first, and it drops cleanly behind the
  Phase-004 repo seam (Prisma's generated client competes with hand-written repos). Comparison in
  [../todo/postgres-foundation/PLAN.md](../todo/postgres-foundation/PLAN.md).

## Parked (good ideas — not now)
- Teammate invitations as a full feature (resend / sent-at / expires-at flows). DB + code are
  **scaffolded** for it in Phases 005–006; the feature itself is later.
- SSO (Google / Microsoft) sign-in. Structure is designed for it in Phase 006; the integration is later.

## Lessons learned (one line per phase — what surprised us, so it compounds)
- **001 Monorepo reorg** — a previous run-ahead left untracked duplicate file copies that polluted the
  baseline; clean the working tree *before* trusting a "tests green" baseline.
- **002 Conventions** — borrowing proven community skills (TDD, security-review) beat writing our own;
  only the project-specific rulebooks were worth hand-authoring.
- **003 TypeScript** — leaf-first, strict-from-the-start conversion kept every step green; the discipline
  that paid off was banning `any`/`@ts-ignore` escapes rather than papering over unclear shapes.
- **004 Backend API** — the real test of clean layering wasn't the routes, it was "can storage swap
  without touching the service" — writing each test before its code forced that seam to stay honest.
- **005 Postgres** — **the load-order bug:** the live server picked file-vs-Postgres at module load but
  loaded `.env` *after* imports, so it silently wrote to files despite `DATABASE_URL`. The round-trip test
  missed it because it bypassed the controller. Lesson: verify the *destination* (query the DB), don't
  infer persistence from routing logic; test the wiring path the live server actually takes.
- **006 Auth** — "done" can be half-true at the seam: the back-end front door works fully, but there's no
  login *screen* yet. Name what a phase does **not** cover at sign-off so the next phase's scope is clear.

## Activity log (newest first)
- **2026-06-29** — **Full pre-007 audit + tracker reconciliation.** Confirmed phases 001–006 all done,
  signed off, and archived in `done/` (`npm test` 49/49, typecheck clean, offline). Found three of the
  project's five progress trackers had drifted stale (`SERO_BOARD.md` still said "005 active", this
  `PROGRESS.md` had 006 as `not-started`, the how-it-works changelog stopped at Jun 14) plus a wrong
  "nothing pushed / main ahead" claim (`main` is in sync with origin). Reconciled all three to
  006-done/007-next, corrected the push-state claim, and added the Lessons section below. Doc-only, $0.
- **2026-06-29** — **Phase 006 (Auth — the front door) → ✅ DONE & SIGNED OFF.** Built across 4 sub-phases:
  (1) `auth_sessions` table + bcryptjs ready (`2e43a42e`); (2) register & login, bcrypt hashing, raw
  password never stored — proven by test (`d1a6b8c6`); (3) session cookie on login + a guard that refuses
  logged-out access to protected pages, plus a `DEV_AUTOLOGIN` one-click side-door hard-sealed in prod
  (`c303f136`); (4) signup creates the org + first-user-owner, every query fenced to the caller's company —
  proven company A can't read company B (`0789c1e0`). Build-board badges marked done (`b812915f`).
  Live-proved against Postgres (login flow + two-company isolation). All free — no OpenAI run. **Phase 007
  (frontend app / login screen) is now next.** Note: 006 delivered the *back-end* front door only — there's
  still no login *screen* in the clickable app; that's 007.
  Phase 4 (boot-restore in `startSweep`, `backend/db/README.md`, boot-restore assertion in the round-trip
  test; 47/47). A pre-commit DB check caught a **load-order bug**: the sessions controller picks
  file-vs-Postgres at module load, but `server.ts` loaded `.env` in its body (after imports), so the live
  server silently fell back to **files despite `DATABASE_URL`** — Carl's first run (`2026_Jun28_22-21`)
  went to files (the earlier "it saved to the DB" claim was wrong, corrected). Fix
  `backend/api/env-boot.ts` (loads `.env` as the first import) committed with the close-out; verified — the
  live "DB Wiring Test" run is in Postgres. Closed out: PLAN → ✅, folder → `docs/todo/done/`, badge →
  Built, this log → done. Free (no OpenAI). **Parked:** (1) regression test for the live DB-wiring path
  (round-trip test missed the bug — bypasses the controller) — spun off as a task; (2) planner question
  drift (separate engine track) — review next. **Phase 006 (Auth) is now active.**
- **2026-06-28** — **Phase 005 · Phase 3 (connection pool + repo swap) → ✅ signed off, committed, pushed.**
  DB-run pick = **managed Neon Postgres** (Docker not installed). Carl created the DB + added `DATABASE_URL`
  to the gitignored `.env`; `db:migrate` built the 5 tables (+ `0001` adding `sessions.session_key`, since
  session ids are slugs not uuids). Swapped session storage file → Postgres behind the **same
  `SessionsRepo` interface** (`sessions.service.ts` untouched): lazy pool (`backend/db/client.ts`), async
  durable layer (`backend/db/sessions-store.ts`), `pgSessionsRepo` (write-through mirror — in-memory Map
  stays the sync hot store; create/persist mirror to PG fire-and-forget), controller switch
  (`DATABASE_URL` set → Postgres, else file). Round-trip test proves a session reads back **from the DB**
  (9/9); skips when no `DATABASE_URL` so `npm test` stays green offline. **47/47**, typecheck clean. All
  free — no OpenAI. Neon password rotated after it was pasted in chat. `UsersRepo` deferred to 006 (no
  consumer yet). **Phase 4 (boot-restore wiring + setup docs + restart walk) is next.**
- **2026-06-28** — **Phase 005 · Phase 2 (schema + first migration) → ✅ signed off, committed, pushed.**
  Carl walked the QA and approved. Built on Drizzle: `backend/db/schema.ts` (5 tables per the locked
  rules) + generated migration `0000_glorious_sunset_bain.sql`, `drizzle.config.ts`, `db:generate` /
  `db:migrate` scripts. `npm test` 46/46, typecheck clean. Then **opened Phase 3 (repo swap) and hit a
  blocker:** the round-trip proof needs a running Postgres and **Docker is not installed** on this machine.
  Put the DB-run choice to Carl (Docker Desktop / no-Docker in-process test DB / native or managed
  Postgres) before writing pool + repo code. Still $0 — no OpenAI run.
- **2026-06-28** — **Phase 005 tool locked = Drizzle; handover written.** Carl picked Drizzle; wrote
  [../todo/postgres-foundation/HANDOVER.md](../todo/postgres-foundation/HANDOVER.md) for a fresh thread to
  continue the build (write phase-2/3/4 in Drizzle's shape, then Phase 2 — first migration). No code yet —
  handover only, so the next thread starts clean.
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
