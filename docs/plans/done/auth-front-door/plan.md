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
- Tables already created: `organizations`, `users` (nullable `password_hash`, `role` = owner/admin/member, unique email), `invitations`, `sessions`, `runs` — all org-scoped. See [backend/db/schema.ts](../../../../backend/db/schema.ts).
- [backend/api/middleware/request-context.ts](../../../../backend/api/middleware/request-context.ts) builds an **anonymous** identity today — the slot the login check drops into.
- [backend/api/middleware/require-auth.ts](../../../../backend/api/middleware/require-auth.ts) is a **no-op pass-through** today — Phase 006 replaces its body with the real check.

## Decisions (my recommendation — confirm or change)
- **Password hashing:** `bcryptjs` (pure-JS, no native build step — safest on your Windows home machine). One-way; the raw password is never stored.
- **Login pass:** a server-side **session row** + an httpOnly, secure cookie holding an opaque session id. Revocable, simple to reason about — preferred over a stateless JWT (no secret-rotation headaches, can log someone out for real). Adds one small `auth_sessions` table.
- **Dev side-door:** active **only** when `NODE_ENV` is not `production` **and** `DEV_AUTOLOGIN` is set. Off by default. A test proves it is dead in production even if the flag is on.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Accounts tables ready | `auth_sessions` table + confirm the account tables are complete; `bcryptjs` installed | 🔨 |
| 2 | Register & login with safe passwords | Register hashes the password; login verifies it; raw password never stored | ✅ |
| 3 | Keep people in, guard the doors (+ dev side-door) | Login issues a secure cookie; logged-out is refused on protected pages; `DEV_AUTOLOGIN` one-click in, sealed in prod | ✅ |
| 4 | Signup creates the company | Register creates the org + owner; every query fenced to the caller's company | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ committed `2e43a42e`.** **Phase 2 ✅ committed `d1a6b8c6`.**
**Phase 4 ✅ 2026-06-29 — signup creates the company + data fenced.** Register now creates an
`organizations` row and its **owner** in one transaction (org name from a `company` field, default
"<name>'s Company"). New org-fenced read `GET /api/v1/auth/me/runs` returns only the caller's company's runs;
fencing proven by `org-data.test.ts` and a live two-company isolation check (Acme sees only Acme, Beta only
Beta, logged-out 401). Honest scope note: the **legacy anonymous admin endpoints still use the pre-auth
placeholder org** (`db/sessions-store.ts` `DEFAULT_ORG_ID`) until the login UI wires real identity through —
that's Phase 7, not this plan. `npm test` 49/49 ✅, typecheck clean ✅.

**🎉 PHASE 006 COMPLETE — all 4 phases ✅. Closed out to `docs/archive/done/` 2026-06-29.**

Phase 3 detail — Login creates an `auth_sessions`
row and sets an httpOnly cookie (Secure added in production only, so local http dev still works); a refresh
keeps you in. `buildIdentity()` reads the cookie → real `{userId, orgId, roles}`; `requireAuth()` rejects
when logged-out. Added `POST /api/v1/auth/logout` (clears cookie **and** deletes the row — a real
revocation) and a protected `GET /api/v1/auth/me`. Dev side-door: `DEV_AUTOLOGIN` (non-prod only) auto-logs
in with no cookie — **hard-gated dead in production** (proven by a test). Existing endpoints are left
unguarded on purpose (broad fencing is Phase 4) so the admin app keeps working. `npm test` 48/48 ✅, typecheck
clean ✅. Live proof against the running server: register→login→/me(200)→/me-no-cookie(401)→logout→/me-with-old-cookie(401),
plus side-door(200). Not committed yet (commits on your green light).
Phase 2 detail —
New `backend/api/services/auth/`
(controller → service → repo + mirrored tests): `POST /api/v1/auth/register` and `POST /api/v1/auth/login`.
Passwords scrambled with `bcryptjs` (cost 10); the raw password is never stored, logged, or returned.
Rejects weak passwords (< 8 chars), duplicate emails, and wrong logins (generic "email or password is
incorrect" — no account-existence leak). Email normalized to lower-case. Users attach to a shared default
org for now (Phase 4 makes register create the company). `npm test` 48/48 ✅, typecheck clean ✅. Live proof
against Postgres confirmed: stored hash is bcrypt (not the raw password), login right/wrong behave. Not
committed yet (commits on your green light).
**Baseline (free):** `npm test` → 48/48. (The paid `npm run gate` needs your explicit go-ahead with a cost first — not run by default.)

## Parked
- **Invitations / resend / expiry flow** — table exists, feature is later.
- **Password reset / "forgot password"** — not in this phase.
- **Email verification** — later.
- **Admin/member role permissions beyond owner** — roles are stored; enforcing fine-grained permissions is later.
- **Customer-facing login screens** — that's Phase 007. Phase 006 is the backend front door + API.
