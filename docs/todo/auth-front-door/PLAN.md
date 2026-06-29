# Phase 006 — The front door (Auth)

**Goal:** A real login system — register and log in with safe passwords, guarded pages, and signup that creates the company so data belongs to the organisation, not a lone person. Plus a private side-door so Carl can skip the password while testing.
**Driver:** Carl
**Created:** 2026-06-28

## Done means
- You can register, and doing so creates **both** a person and their company (you become the owner).
- You can log in; a refresh keeps you logged in; logged-out, a protected page turns you away.
- Two companies cannot see each other's data.
- On your home machine, one switch logs you straight in (no password typing) — and that switch is **sealed shut for real customers**, proven by a test.

## Foundation already in place (from Phase 005)
This phase fills seams that already exist — it is not from scratch:
- Tables already created: `organizations`, `users` (nullable `password_hash`, `role` = owner/admin/member, unique email), `invitations`, `sessions`, `runs` — all org-scoped. See [backend/db/schema.ts](../../../backend/db/schema.ts).
- [backend/api/middleware/request-context.ts](../../../backend/api/middleware/request-context.ts) builds an **anonymous** identity today — the slot the login check drops into.
- [backend/api/middleware/require-auth.ts](../../../backend/api/middleware/require-auth.ts) is a **no-op pass-through** today — Phase 006 replaces its body with the real check.

## Decisions (my recommendation — confirm or change)
- **Password hashing:** `bcryptjs` (pure-JS, no native build step — safest on your Windows home machine). One-way; the raw password is never stored.
- **Login pass:** a server-side **session row** + an httpOnly, secure cookie holding an opaque session id. Revocable, simple to reason about — preferred over a stateless JWT (no secret-rotation headaches, can log someone out for real). Adds one small `auth_sessions` table.
- **Dev side-door:** active **only** when `NODE_ENV` is not `production` **and** `DEV_AUTOLOGIN` is set. Off by default. A test proves it is dead in production even if the flag is on.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Accounts tables ready | `auth_sessions` table + confirm the account tables are complete; `bcryptjs` installed | 🔨 |
| 2 | Register & login with safe passwords | Register hashes the password; login verifies it; raw password never stored | ⬜ |
| 3 | Keep people in, guard the doors (+ dev side-door) | Login issues a secure cookie; logged-out is refused on protected pages; `DEV_AUTOLOGIN` one-click in, sealed in prod | ⬜ |
| 4 | Signup creates the company | Register creates the org + owner; every query fenced to the caller's company | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 build done 2026-06-29 — awaiting Carl's QA + green light.** Added the `auth_sessions` table
([schema.ts](../../../backend/db/schema.ts)), generated + applied migration `0002_stormy_ricochet.sql`
(table confirmed live in Postgres — all 6 cols, 4 indexes), installed `bcryptjs` (+ `@types/bcryptjs`),
confirmed the account tables already carry every field auth needs. `npm test` 47/47 ✅, typecheck clean ✅.
Not committed yet (commits on your green light).
**Baseline (free):** `npm test` → 47/47. (The paid `npm run gate` needs your explicit go-ahead with a cost first — not run by default.)

## Parked
- **Invitations / resend / expiry flow** — table exists, feature is later.
- **Password reset / "forgot password"** — not in this phase.
- **Email verification** — later.
- **Admin/member role permissions beyond owner** — roles are stored; enforcing fine-grained permissions is later.
- **Customer-facing login screens** — that's Phase 007. Phase 006 is the backend front door + API.
