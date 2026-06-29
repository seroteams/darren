# Phase 1 — Accounts tables ready

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Make sure every table auth needs exists, and add the one missing piece — a place to store login passes.

## Changes
- Add an `auth_sessions` table to [backend/db/schema.ts](../../../backend/db/schema.ts): an opaque session id, the user it belongs to, the org, an expiry, created-at. (This is the *login pass* store — separate from the existing `sessions` table, which is the 1:1 prep session.)
- Generate the migration (`npm run db:generate`) and apply it (`npm run db:migrate`).
- Install `bcryptjs` (the password-scrambler) so it's ready for Phase 2.
- Confirm `organizations`, `users`, `invitations` already have every field auth needs (they do — this is a read-and-confirm, not a rebuild).

## Not in this phase
- No register/login yet — no endpoints, no hashing in use. This is only the tables + the library installed.
- No reading or writing of `auth_sessions` yet.

## Done when
- [ ] `npm run db:generate` produces a new migration with no errors.
- [ ] `npm run db:migrate` applies clean against a fresh database.
- [ ] `npm test` and `npm run typecheck` stay green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Tables build from clean** — start the database fresh and run the migrate command. You should see it finish without errors, and the new `auth_sessions` table listed alongside the others. ❌ Not OK if any table is missing or the command errors.
2. **Nothing else broke** — run `npm test`. You should see the same number of passing tests as the baseline (or more). ❌ Not OK if a previously-passing test now fails.
