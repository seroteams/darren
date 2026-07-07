# Phase 0 — Safety and schema check

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Lock the facts every later phase depends on — before any mutation code. No code, no migration; the output is a written go/no-go in PLAN.md.

## Why
The action phases promise things ("runs kept but orphaned", "live sessions killed", "last manager protected"). Those only hold if the live schema and auth internals support them. Confirm first, assume nothing.

## Changes
- **Superadmin access — ✅ already confirmed (this session).** `.env` has `SUPERADMIN_EMAILS=carl@seroteams.com`; logging in as `carl@seroteams.com` / `serodev123` shows the screen live. Just record it.
- **Schema of record:** confirm the live `users` columns ([schema.ts](../../../backend/db/schema.ts)) and the `runs.userId` **FK + nullability**. Phase 4 promises orphaned runs (`userId = null`) — only holds if nullable and the FK isn't `on delete cascade`. If not, record the migration Phase 4 needs.
- **Guardrail facts:** how to count active manager/admin per org; how `auth_sessions` are revoked (Phase 3); the token/expiry pattern to reuse (Phase 5); whether email-send infra exists (Phase 5 link-vs-email).
- Write it all into PLAN.md "Current state".

## Not in this phase
- Any code, route, migration, or UI change.

## Done when
- [x] Superadmin access confirmed (this session).
- [ ] `users` schema + `runs.userId` FK/nullability confirmed and written down.
- [ ] Session-revocation, active-manager-count, token, and email-infra facts documented in PLAN.md.
- [ ] Go/no-go recorded.
- [ ] Product owner has read the findings and said go.

## Test scenarios — for the product owner
1. **Facts written down** — read the Phase 0 findings in PLAN.md. The schema answer and the "what happens to a deleted user's runs" answer are stated plainly, not assumed. ❌ Not OK if either is still a guess.
