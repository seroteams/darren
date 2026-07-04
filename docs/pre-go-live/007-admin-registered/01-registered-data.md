# Phase 007 · Step 01 — Enrich the registered data (backend, test-first)

## Goal
Add the return-visit signal to the superadmin data: per-user run count + last-active, and an alpha-wide
rating summary — the numbers that answer "are they coming back, and is it landing?".

## What you'll have
- `GET /api/v1/admin/registered` (the PG6 endpoint) now returns, per user: `runCount`, `lastActiveAt`, and
  `runsThisWeek` / `runsLastWeek`; plus a top-level `summary`: `{ avgStars, ratedCount, lowCount }` (low = ≤2)
  across **all** alpha runs.
- All derived from existing run timestamps + PG3 ratings — **no new tracking infrastructure**.
- Still behind `requireSuperadminRoute`, still read-only, still no `password_hash`.

## A grounding example
- **Before:** the endpoint says "Proptech Builders — Darren (owner), Priya (member)".
- **After:** "…Darren (owner, 4 runs, last active Jul 3, 2 this week / 1 last), Priya (member, 1 run, last
  active Jul 1)" and up top "★ 3.6 avg over 27 runs · 3 low scores".

## Technical detail
- Extend `services/superadmin/`: the repo stays read-only; add a read that maps runs to their owner. Runs
  are attributed by `userId` (the same attribution `/runs/mine` uses) and walked per-org by
  `run-history` — reuse that walk across all orgs rather than a new query path.
- Keep the grouping/derivation in the **service** (unit-testable with a fake repo): count per user, max
  timestamp = last-active, week buckets from a passed-in "now" (so the test is deterministic), and fold all
  ratings into the alpha summary.
- **Timezone/`now`:** pass the reference time into the service (don't read the clock inside it) so
  `runsThisWeek`/`runsLastWeek` are testable.
- Never select or expose a secret; the per-company fence for every non-superadmin path is untouched.

## Check
- Tests first (red→green, fake repo): run counts + last-active per user, week bucketing against a fixed
  `now`, alpha `summary` (avg/rated/low) correct, a user with no runs → `runCount: 0` (not omitted), and
  no `passwordHash` in the payload. The PG6 guard still fences it (owner → 403). `npm test` + typecheck
  green. No OpenAI.
