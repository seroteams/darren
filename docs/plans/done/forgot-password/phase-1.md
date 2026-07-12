# Phase 1 — Backend reset flow

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-11 — Carl walked the end-to-end proof + confirmed the branded email in his inbox ("A")
Committed with the phase-close ritual (local). Sender decided: seroapp.com (local `.env`; live `render.yaml` untouched, key set in Render at go-live). Phase 2 (UI) next.

## Built (2026-07-11)
Landed (backend only, no UI yet):
- `backend/db/schema.ts` — new `password_reset_tokens` table → migration `backend/db/migrations/0014_flat_storm.sql`.
- `backend/api/services/auth/auth.repo.ts` — `PasswordResetRepo` + `pgPasswordResetRepo`.
- `backend/api/services/auth/auth.service.ts` — `createPasswordResetService` (`requestPasswordReset`, `resetPassword`).
- `backend/api/services/auth/auth.controller.ts` — `forgotPassword` + `resetPassword` handlers.
- `backend/api/server.ts` — `POST /api/v1/auth/forgot-password` + `/reset-password` (origin-guarded; request rate-limited 5/min/IP).
- `backend/api/services/notifications/notifications.service.ts` — `notifyPasswordReset` branded email.
- Tests: `auth.service.test.ts` +8 reset cases, `notifications.service.test.ts` +1 reset-email case.

Offline proof (free, no OpenAI): `npm run typecheck` clean · reset service + notifications tests **27/27 pass**.

Live proof (2026-07-11, real dev DB + real Resend, no OpenAI): end-to-end loop on `manager@` —
mint → token stored as sha256 (raw never in DB) → reset → login with new password → reused token
refused → original dev password restored. One real branded email delivered to carl@seroteams.com
from `notifications@seroapp.com`. Migration `0014` applied to the dev DB.

**Sender domain — DECIDED: seroapp.com.** Local `.env` swapped to the "SeroApp-New" key
(`re_YsSwVzhc…`) + `notifications@seroapp.com` (was sero.team / `re_2JMBPma3…`). `render.yaml`
(live) left UNCHANGED on purpose — go-live also needs this key set in Render's dashboard, so
that's a deploy step, not part of Phase 1. Resend FYI: seroapp.com uses shared click tracking
(minor deliverability note, not a blocker).

## Goal
Two public endpoints — request a reset link, and set a new password with a token — backed by a hashed single-use token table and the branded reset email, delivering from the verified `seroapp.com` sender.

## Changes
- **Schema** — new `password_reset_tokens` table in `backend/db/schema.ts` (mirror `auth_sessions`): `id` · `user_id` FK→users (indexed) · `token_hash` unique · `expires_at` · `used_at` nullable · `created_at`. Generate migration with `npm run db:generate`.
- **Repo** — `backend/api/services/auth/auth.repo.ts`: add a separate `PasswordResetRepo` interface + `pgPasswordResetRepo` (kept separate, like `AuthSessionRepo`, so register/login's fake stays untouched): `findUserByEmail`, `createResetToken`, `findByTokenHash`, `markUsed`, `updatePasswordHash`.
- **Service** — `auth.service.ts`: add `createPasswordResetService(repo, hasher)` with `requestPasswordReset(email)` (returns `{email, token, expiresAt}` or `null` for unknown/deactivated) and `resetPassword(token, newPassword)` (validates, updates hash, burns token). Reuse `MIN_PASSWORD_LENGTH = 8`, sha256 token hashing, 1-hour TTL.
- **Controller + routes** — `auth.controller.ts`: `forgotPassword` (always 200, generic message; sends email only when the service returns a token) + `resetPassword`. Wire `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` in `server.ts`, origin-guarded + IP rate-limited.
- **Email** — `notifications.service.ts`: add `notifyPasswordReset({ to, resetUrl })`, cloned from `notifyInviteeOfInvite`.
- **Sender config** — `render.yaml` + `.env`: `EMAIL_FROM = "Sero <notifications@seroapp.com>"`; `EMAIL_API_KEY` (the provided key) in local `.env` + Render dashboard (stays `sync: false`).
- **Tests** — add reset cases to `auth.service.test.ts` (in-memory fake, no DB, no OpenAI).

## Not in this phase
- Any front-end (the "Forgot password?" link + the two screens) — that's Phase 2.
- Revoking existing sessions / purging sibling tokens (parked).

## Done when
- [ ] Migration file generated; `password_reset_tokens` exists in the schema snapshot.
- [ ] `npm run typecheck` clean and `auth.service.test.ts` green, including the new reset cases (unknown-email → no token; expired/used token rejected; short password rejected; token stored hashed, never raw).
- [ ] Hitting `POST /api/v1/auth/forgot-password` for a real account produces a reset email; the emailed link + `POST /api/v1/auth/reset-password` sets a new password that logs in.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
These are backend-only, so I'll drive them for you (curl against a local DB) and show the output — no UI yet. Green-light means the API + email are proven; Phase 2 adds the screens.
1. **Happy path** — request a reset for your own account → a branded Sero email arrives from `notifications@seroapp.com` with a "Reset your password" button. Following the link's token and posting a new password succeeds, and logging in with the new password works. ❌ Not OK if no email arrives or the new password is rejected at login.
2. **Unknown email** — request a reset for an address with no account → the API still returns the same generic success, and no email is sent. ❌ Not OK if it errors or reveals the email doesn't exist.
3. **Expired / reused link** — a token past 1 hour, or one already used once, is refused with a plain "link isn't valid anymore" message. ❌ Not OK if a used or expired link still sets a password.
