# Phase 1 — Choose the migration tool + lock the conventions

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Pick the one database tool we'll build everything on (**Drizzle** or **Prisma**), confirm the database
rules, and log the decision — so the later steps stand on a locked foundation. **No code this phase.**

## What you'll have when it's done
- A logged decision in `PROGRESS.md`: "Phase 005 uses **<tool>** — because …".
- The DB rules (uuid keys, `snake_case` plural tables, `timestamptz`, `jsonb`) confirmed against the
  exact 5 tables we'll create next.
- The green light for me to write the detailed `phase-2/3/4.md` step files in that tool's shape.

## A grounding example (before → after)
- **Before:** "we'll use Postgres" — but *how* we describe tables and ship changes is undecided, so the
  first migration could be written two different ways.
- **After:** "we use **Drizzle**; the schema is a TypeScript file; every change is a versioned SQL
  migration in `backend/db/migrations/`." Now Phase 2 has exactly one correct shape.

## The decision (full comparison in [PLAN.md](PLAN.md))
- **Recommended: Drizzle** — schema in TypeScript (one language), SQL-first (you see what runs), and it
  drops cleanly *behind* the hand-written repo seam Phase 004 just built.
- **Alternative: Prisma** — more batteries-included DX + a visual data browser, but adds a separate
  schema DSL and a generated client that competes with our repo seam.
- Either satisfies every locked DB rule. This is a long-lived foundation choice — yours to lock.

## Not in this phase
- Writing any migration or schema code (Phase 2).
- The connection pool or repo swap (Phase 3).
- docker-compose / `DATABASE_URL` (Phase 4).

## Done when
- [ ] You've read the Drizzle-vs-Prisma comparison and **named the tool** (Drizzle or Prisma).
- [ ] The 5 tables + DB rules read right to you (orgs, users, sessions, runs-index, invitations).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. The next phase waits for your green light.
1. **Read & choose** — open [PLAN.md](PLAN.md), read the "Drizzle vs Prisma" table. You should be able to
   say in one sentence which we're using and why. ❌ Not OK if it's unclear what we're choosing or the
   trade-off doesn't make sense to you.
2. **Rules match the standards** — the DB rules (uuid keys · `snake_case` plural tables · `timestamptz` ·
   `jsonb` not `text` · `org_id` on tenant tables) match what you locked on 2026-06-19. You should see no
   surprises.
3. **Scope is right** — you're comfortable that **only** orgs/users/sessions move to the database this
   phase, and the heavy run-history logs **stay on disk** (indexed by a `runs` row). ❌ Not OK if you
   expected the logs to move too — tell me and we re-scope.

→ **Green light** = I log the tool choice in `PROGRESS.md` and write the detailed `phase-2/3/4.md` files
in that tool's shape. (Building still also waits on your **Phase 004** approval — see the gate in PLAN.md.)
