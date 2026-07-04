# Phase 006 · Step 01 — The superadmin identity + guard (test-first)

## Goal
Give one allowlisted email (Carl's) a `requireSuperadmin` gate, resolved **server-side** from the logged-in
session — never from anything the client can send.

## What you'll have
- `SUPERADMIN_EMAILS` (env, comma-separated) → a normalized allowlist.
- `requireSuperadmin(identity)` beside [require-auth.ts](../../../backend/api/middleware/require-auth.ts)
  and a `requireSuperadminRoute(handler, lookup?)` wrapper mirroring
  [admin-guard.ts](../../../backend/api/middleware/admin-guard.ts) — 401 anonymous, **403** logged-in
  non-superadmin, handler only for a superadmin.
- Tests written **first** proving: superadmin passes; a normal owner → 403; the dev side-door identity → 403.

## A grounding example
- **Before:** every logged-in owner/admin can reach any admin-guarded route.
- **After:** only an identity whose server-resolved email is on `SUPERADMIN_EMAILS` clears `requireSuperadmin`;
  everyone else (owners included) gets 403.

## Technical detail
- **Email is already server-resolved.** `RequestIdentity.email` (request-context.ts) comes from the session
  lookup (`findIdentityByToken` → `SessionIdentity`), not from any header/cookie/body. The guard reads
  `identity.email` only — **never** a client value. (No `SessionIdentity` change needed; email is present.)
- One shared normalizer `normalizeEmail(x)` (trim + lower-case; empty/null → null) applied to **both** sides
  of the compare, so allowlist matching can't drift. Parse `SUPERADMIN_EMAILS` once into a `Set`.
- `isSuperadminIdentity(identity)`: `identity.email != null && allowlist.has(normalizeEmail(identity.email))`.
  `requireSuperadmin(identity)`: `requireAuth` first (401 before 403), then 403 if not superadmin — same
  order as `requireAdmin`.
- `requireSuperadminRoute` = copy of `requireAdminRoute` swapping the guard, so the identity lookup stays
  injectable (unit-testable without a DB).
- **Dev side-door proof:** `devIdentity()` returns `dev@seroteams.com` (request-context.ts) — deliberately
  not an allowlisted email. A test asserts that even with `DEV_AUTOLOGIN` on, the dev identity is **not**
  superadmin; the 403 tests otherwise run with `DEV_AUTOLOGIN` off.

## Check
- Tests first (red), then green: `superadmin → passes`, `owner → 403`, `anonymous → 401`, `dev side-door →
  403`, `normalizeEmail` folds case/whitespace and rejects empty. `npm test` green, `npm run typecheck`
  clean. No route wired yet — that's Step 02. No OpenAI.
