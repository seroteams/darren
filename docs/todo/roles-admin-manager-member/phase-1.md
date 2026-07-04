# Phase 1 — Switch the role model

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (applied + verified 2026-07-04: enum = manager/admin/member, counts admin=1/manager=11/member=1, carl=admin; 57/57 tests green)

## Goal
Turn the role model into `admin / manager / member` for real — the enum, the existing accounts, new signups, and the console gate — all in one step so the app never references a role that no longer exists.

## Why it's one phase, not two
The database enum and the code that uses it have to move together. If the enum loses "owner" while the code still inserts/checks "owner", logins and signups break. So the enum rename, the data migration, the signup default, and the access gate all land in the same phase, and the app keeps working end to end.

## Changes
- **Enum** — `backend/db/schema.ts`: `user_role` values `["owner","admin","member"]` → `["admin","manager","member"]`.
- **Migration** — **hand-authored SQL** (not left to the generator — `drizzle-kit` mangles enum-value changes; it tries to drop/recreate the type, which fails because rows depend on it). The migration does exactly:
  - `ALTER TYPE user_role RENAME VALUE 'owner' TO 'manager';` (renames in place — every existing `owner` row becomes `manager` automatically; transaction-safe), then
  - `UPDATE users SET role = 'admin' WHERE lower(email) = 'carl@seroteams.com';`
  - Also sync drizzle's `migrations/meta/*` snapshot so the next `db:generate` isn't confused by the hand-edit.
- **Signup** — `backend/api/services/auth/auth.repo.ts`: new users created with `role: "manager"` (was `"owner"`).
- **Console gate** — `backend/api/middleware/require-auth.ts`: `ADMIN_ROLES` `["owner","admin"]` → `["admin","manager"]`.
- **Dev side-door** — `backend/api/middleware/request-context.ts`: `devIdentity()` has `roles: ["owner"]`; flip to `["admin"]` or the dev login gets a 403 the moment the gate changes above. (Still not superadmin — that's email-based and unchanged.)
- Any other **functional** code that branches on the `"owner"` role string (not display text — that's Phase 2).

## Not in this phase
- User-facing wording that says "owner" (labels, copy) → Phase 2.
- Seed scripts and test fixtures/assertions still saying "owner" → Phase 2 (Phase 1 updates only what's needed to keep the app + its core tests green).
- Renaming the `createOrgWithOwner` method / `NewOrgOwner` type — parked (cosmetic).

## Running the migration (needs Carl's OK)
The migration runs against the **live Neon database** — a real, hard-to-undo data change (though the rename is reversible and I'll snapshot the before-state). I will **not** run `npm run db:migrate` until Carl says go. No OpenAI cost involved.

## Done when
- [ ] `backend/db/schema.ts` enum is `admin / manager / member`; a migration file is generated and reviewed.
- [ ] Migration applied: DB shows `carl@seroteams.com` = `admin`, all former owners = `manager`, members unchanged, and no row is `owner`.
- [ ] Signup inserts `manager`; the console gate allows `admin` + `manager`.
- [ ] `npm test` (free) is green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **You still rule** — log in as `carl@seroteams.com`. You should still reach the admin console AND the superadmin screens (Registered / drilldown). ❌ Not OK if you're locked out of either.
2. **Existing user still works** — log in as an existing signup (e.g. Daniel / `carl@webcoursesbangkok.com`, or a test owner). You should still get into the console exactly as before. ❌ Not OK if they hit "Admins only".
3. **New signup = manager** — register a fresh test account. After it lands, check its role in the DB (I'll show you) — it should read `manager`, and the account should get into the console. ❌ Not OK if it says `owner` or is blocked.
4. **Member stays out** — log in as `member@seroteams.com`. It should behave exactly as today (no console). ❌ Not OK if it changed.
5. **No "owner" left in the DB** — I'll show you a role count over the users table. You should see only `admin`, `manager`, `member`. ❌ Not OK if any `owner` remains.
