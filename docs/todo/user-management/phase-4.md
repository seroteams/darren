# Phase 4 — Reset password / send invite

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The superadmin can produce a one-time link that lets any user set their own password — used both to reset a forgotten password and to invite someone who's never logged in — without ever seeing or typing the password.

## Why
Least-defined action (its delivery path — copyable link vs email — is decided by Phase 0's email-infra finding), so it's built last. It closes the loop: an admin can onboard or recover any account.

## Changes
- **Tokens (hard requirements):** a reset/invite token is **single-use**, **expiring** (short TTL), **stored hashed** (never plaintext at rest), and the **full token is never logged or audited** — the audit records only that a reset was *issued* (actor, target, token id/prefix, outcome). Reuse the auth-session/token patterns in [auth.repo.ts](../../../backend/api/services/auth/auth.repo.ts).
- **Backend:** `POST /api/v1/admin/users/:id/reset-password` → mint the token, return a copyable link **or** trigger email if Phase 0 found infra. A user with no `passwordHash` uses the same flow as an "invite".
- **Frontend:** a "Reset password / invite" action → shows the copyable link once (or a "sent" confirmation).
- **Tests:** service tests for single-use, expiry rejection, hashed-at-rest, and that the raw token never reaches logs/audit.

## Not in this phase
- Email-templating polish (parked). Self-service "forgot password" for end users (separate feature).

## Done when
- [ ] Superadmin can produce a working reset/invite link.
- [ ] The link lets the user set a new password and log in with it.
- [ ] A used or expired link is rejected.
- [ ] The token never appears in logs or the audit.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself.
1. **Reset works** — reset a user's password, open the link, set a new password, log in with it. ❌ Not OK if the link doesn't work.
2. **Single-use** — reuse the same link → rejected.
3. **Expires** — wait past expiry (or force-expire) → rejected.
4. **Invite** — invite a never-logged-in user the same way; they set their first password.
5. **No token leak** — the reset shows in the audit, but the full token is nowhere in logs or the audit file.
