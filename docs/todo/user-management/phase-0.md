# Phase 0 — Safety and schema check

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Lock the facts every later phase depends on — before a single line of mutation code is written. No code changes, no migration; the output is a written go/no-go in PLAN.md.

## Why
The mutation phases make promises ("runs are kept but orphaned", "live sessions are killed", "the last manager is protected"). Those promises only hold if the live schema and auth internals actually support them. Confirm first, assume nothing.

## Changes
- **Superadmin access:** confirm `carl@seroteams.com` is in `SUPERADMIN_EMAILS` and that Carl can open the Registered screen (the nav screenshot showed no "Registered" item). If it's missing, the allowlist/env fix happens here, first.
- **Schema of record:** confirm the live `users` columns ([backend/db/schema.ts](../../../backend/db/schema.ts)) and — critically — the `runs.userId` **FK and nullability**. If it isn't nullable (or the FK is `on delete cascade`), record exactly which migration Phase 3 will need.
- **Guardrail facts:** pin down how to count "active manager/admin per org", how `auth_sessions` are stored + revoked (for Phase 2), the token/expiry pattern to reuse (for Phase 4), and whether any email-send infra exists (decides Phase 4's link-vs-email path).
- Write all of it into PLAN.md's "Current state".

## Not in this phase
- Any code, route, migration, or UI change.

## Done when
- [ ] Carl can open Registered and see all companies.
- [ ] `users` schema + `runs.userId` FK/nullability confirmed and written down.
- [ ] Session-revocation, active-manager-count, token, and email-infra facts documented in PLAN.md.
- [ ] Go/no-go recorded.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **You can see it** — open the Registered screen as yourself. You should see every company and person. ❌ Not OK if it's missing or 403 — that's the allowlist, fix it first.
2. **The facts are written down** — read the Phase 0 findings in PLAN.md. The schema answer and the "what happens to a deleted user's runs" answer should be stated plainly, not assumed. ❌ Not OK if either is still a guess.
