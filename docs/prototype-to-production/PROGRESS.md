# Progress Log — Prototype → Production

> **This is the living log for the migration.** The AI agent updates it after every action.
> The fixed playbook is **[OVERVIEW.md](OVERVIEW.md)**; this file is the part that changes.
> Carl: you don't edit this — just say "what next?" and the agent reads and updates it.

---

## Where we are now
- **Active phase:** 001 — Monorepo reorg
- **Status:** `not-started` (not broken down into steps yet)
- **Last updated:** 2026-06-19

## Next up (this can change as we learn)
Break **Phase 001 — Monorepo reorg** down into numbered step files inside `001-monorepo-reorg/`.
Say **"what next?"** to do this.

## Phase status
| # | Phase | Status |
|---|---|---|
| 001 | Monorepo reorg | `not-started` |
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

## Parked (good ideas — not now)
- Teammate invitations as a full feature (resend / sent-at / expires-at flows). DB + code are
  **scaffolded** for it in Phases 005–006; the feature itself is later.
- SSO (Google / Microsoft) sign-in. Structure is designed for it in Phase 006; the integration is later.

## Activity log (newest first)
- **2026-06-19** — Reworked the plan to 8 phases: added **003 TypeScript conversion** and **008 Security**,
  renumbered backend/DB/auth/frontend accordingly, and folded in the new standards (TypeScript, TDD,
  RESTful `/api/v1/`, DB conventions + migrations, org/multi-tenant model, SSO-ready auth). Updated
  OVERVIEW and every phase overview.
- **2026-06-19** — Set up `docs/prototype-to-production/`: `OVERVIEW.md` (orchestrator + map) and a
  `00-phase-overview.md` for each phase, and initialised this `PROGRESS.md`.
