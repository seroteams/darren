# Phase 005 (Postgres) — handover for a fresh thread

**Read this first, then [PLAN.md](PLAN.md) + [phase-1.md](phase-1.md). Then continue.**

Date: 2026-06-28 · Branch: `main` · Last commit: `c394778f` (Phase 004 close-out). Committed locally, not pushed.

## Where we are (in one breath)
- **Phase 004 (Backend API v1) is DONE & signed off.** The whole backend is clean layers —
  controller → service → repo under `/api/v1/`, file-backed behind a **swappable repo seam**
  (`backend/api/services/<domain>/<domain>.repo.ts`). Archived at `docs/todo/done/backend-api-v1/`.
- **Phase 005 (Postgres foundation) is the active phase.** This folder is the plan. Goal: move
  **organisations + users + sessions** off JSON files into **Postgres**, behind the *same* repo
  interface so the services don't change. The heavy run-history logs stay on disk, indexed by id.
- **Decision made — the tool is locked:** Carl chose **Drizzle** (2026-06-28). Why: schema is plain
  TypeScript, it's SQL-first (you see what runs), and it drops cleanly behind the Phase-004 repo seam.
  (Full Drizzle-vs-Prisma comparison is in [PLAN.md](PLAN.md).)

## Next actions (in order — for the new thread)
1. **Write the detail.** Phase 1 (choose + log the tool) is done — Drizzle. Now write
   `phase-2.md`, `phase-3.md`, `phase-4.md` in **Drizzle's** shape, each ending with owner QA scenarios
   (same rhythm as Phase 004). Outline is in PLAN.md's phase table.
2. **Free baseline first.** Run `npm test` (expect **46/46**) and note it *before* touching code.
3. **Phase 2 — first migration + schema.** The 5 tables — `organizations`, `users`, `sessions`,
   `runs` (index → on-disk logs), `invitations` — as a **versioned Drizzle migration** that builds the
   DB from clean with one command. Follow the locked DB rules in PLAN.md (uuid keys · `snake_case`
   plural tables · `timestamptz` · `jsonb` not `text` · `org_id` FK + index on tenant tables).
4. **Stop after Phase 2** → Carl walks its QA → green light → commit → only then Phase 3
   (connection pool + swap `SessionsRepo`/`UsersRepo` file → Postgres behind the same interface).

## Rules that matter (don't skip)
- **Darren Method:** one phase at a time. Carl tests + green-lights each before the next. **You don't
  self-certify.**
- **Green light = commit** (local only — no push/PR unless Carl asks).
- **Cost control:** Phase 005 is **all offline/free** until live integration. Never run anything hitting
  OpenAI (`gate`/`smoke`/`eval`/live replays) without Carl's explicit yes + a cost stated first. Default
  to `npm test`. (The Phase-004 $3 budget is untouched; only relevant if a live run is ever needed.)
- **TDD:** test-first for new service/repo logic (red → green). New code is TypeScript, **strict**
  (`npm run typecheck`). *(A migration file itself has no unit test — verify it by building the DB from
  clean + a repo round-trip test.)*
- **Surgical + honest:** touch only what the task needs; surface problems, don't mask them.
- **Keep trackers current:** root `STATUS.md`, `docs/prototype-to-production/PROGRESS.md`, and the
  build-plan badge `admin/src/stages/tasks.js` (set Phase 005 steps' `s` field — `"doing"`/`"done"` — as
  they land). End each reply with a recap card + a short **"In simple terms:"** line.

## Key files
- **This plan:** `docs/todo/postgres-foundation/PLAN.md` (+ `phase-1.md`; phase-2/3/4 to be written).
- **Parent overview:** `docs/prototype-to-production/005-postgres-foundation/00-phase-overview.md`.
- **Live trackers:** root `STATUS.md` · `docs/prototype-to-production/PROGRESS.md`.
- **The seam to swap:** `backend/api/services/sessions/sessions.repo.ts` — pattern reference
  `backend/api/services/runs/` (repo = storage, service = logic, controller = thin).
- **Conventions:** `.claude/skills/backend-conventions/SKILL.md` · project rules `CLAUDE.md`.

## Quick-start prompt for the new thread (paste this)
> Continue Phase 005 (Postgres foundation) with the Darren Method. Read
> `docs/todo/postgres-foundation/HANDOVER.md`, then PLAN.md + phase-1.md, then tell me plainly where we
> are and the next step before doing anything. Tool is **Drizzle** (locked). First run `npm test` (free)
> and report it. Then write phase-2/3/4 step files and start Phase 2 (first migration) — one phase at a
> time, stop for my green light, no paid runs without my yes. End with an "In simple terms:" line.

*(The `/tasks` board in the admin console also has a one-click "Copy continue prompt" for Phase 005,
auto-built from the live build statuses.)*
