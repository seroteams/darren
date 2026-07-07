# Phase 2 — Register & login with safe passwords

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
A working register and login, with passwords stored only as a one-way scramble — the real password is never kept, not even by us.

## Changes
- New auth service + controller under `backend/api/services/auth/` (house layout: slim controller → service → co-located repo + mirrored tests).
- `POST /api/v1/auth/register` — takes email, name, password; scrambles the password with `bcryptjs`; saves the user with only the scramble in `password_hash`.
- `POST /api/v1/auth/login` — looks up the user by email, checks the password against the scramble; says yes/no honestly.
- Reject weak passwords (a sensible minimum length) and duplicate emails with clear errors.

## Not in this phase
- No login pass / cookie / staying-logged-in yet — that's Phase 3.
- No guarding of protected pages yet.
- Register does **not** create the company yet — that's Phase 4 (for now it attaches to a test org).

## Done when
- [ ] A test proves the **raw password is never stored** — only the scramble — and that login accepts the right password and rejects the wrong one.
- [ ] `npm test` and `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Register works** — register a new person with an email and password. You should see it succeed.
2. **The real password is never kept** — after registering, look at that person's row in the database. You should see a long scramble in `password_hash`, **never** the password you typed. ❌ Not OK if your actual password appears anywhere.
3. **Login is honest** — log in with the right password (works), then the wrong password (refused). ❌ Not OK if a wrong password is ever let in.
4. **No weak or duplicate** — try a too-short password (refused) and registering the same email twice (refused) — each with a clear message.
