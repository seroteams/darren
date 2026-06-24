# Progress Log — Prototype → Production

> **This is the living log for the migration.** The AI agent updates it after every action.
> The fixed playbook is **[OVERVIEW.md](OVERVIEW.md)**; this file is the part that changes.
> Carl: you don't edit this — just say "what next?" and the agent reads and updates it.

---

## Where we are now
- **Active phase:** 002 — Conventions & skills
- **Status:** `planned` (broken into 5 steps; step 1 survey done, awaiting Carl's pick)
- **Last updated:** 2026-06-24

## Next up (this can change as we learn)
**Step 2 — install the chosen skills** (Option 1 locked): `obra/superpowers/test-driven-development`
+ `getsentry/skills` → `security-review`. Read each SKILL.md + confirm licence before enabling, then
verify each loads/triggers. Paused for Carl's explicit go before running the installs (they run
third-party code into the repo).

## Phase status
| # | Phase | Status |
|---|---|---|
| 001 | Monorepo reorg | `done` |
| 002 | Conventions & skills | `not-started` |
| 003 | TypeScript conversion | `not-started` |
| 004 | Backend API v1 (RESTful, TDD) | `not-started` |
| 005 | Postgres foundation | `not-started` |
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
- **2026-06-24** — **Phase 002 broken into 5 steps; step 1 (borrow-vs-build survey) written.**
  Researched skills.sh / GitHub. Recommendation written into
  [../todo/convention-skills/PLAN.md](../todo/convention-skills/PLAN.md): borrow **TDD**
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
