# Phase 2 — The hardening

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-07-18) — "do it all"
Carl green-lit the whole fix-list. 16 of 17 findings landed in full, F16 half (the safe half).
Baseline before: 156/156 tests, typecheck clean. After: 156/156 tests (+3 new), typecheck clean,
and a live boot smoke on a spare port — server starts, migration 0019 applied cleanly, the new
`/api/v1/health/deep` route returns `db:"up"`.

**Backend / security:**
- F1 [server.ts] refuse to boot a live deploy with no database.
- F3 [server.ts] per-IP rate limit on login + register (10/min).
- F4 [auth.controller/service/repo] password change/reset now revoke the user's other sessions.
- F9 [auth.repo] session tokens stored hashed (sha256) at rest — cookie carries the raw token. *(One-off: invalidates existing sessions on deploy — everyone logs in once.)*
- F10 [server.ts] origin fence on login/register/logout.
- F11 [server.ts] rate limiters key on the trustworthy last XFF hop, not the spoofable first.
- F12 [router.ts] 5xx responses no longer leak raw internal messages.
- F13 [server.ts + auth.repo] hourly purge of expired sessions + used/expired reset tokens.
- F8 [sessions-store.ts + error-log.ts + server.ts] repeated session mirror-write failures escalate into the superadmin Error log.

**Engine:**
- F6 [reviewer.ts] removed the silent text-rewrite; now flags + logs (engine-honesty).
- F7 [cost.ts + stream-helper.ts + session-streams.ts] cost tracker moved to an AsyncLocalStorage context — concurrent runs can't cross-attribute spend or dodge the $5 ceiling. New isolation test.
- F5 [sessions.service.ts] a manager's typed answer persists on receipt, not only after the plan turn.

**Database / ops:**
- F2 [scripts/backup-db.js + docs/reference/db-backup-restore.md + .gitignore] pg_dump backup script + one-page restore runbook.
- F14 [migration 0019 + schema.ts] unique index on invitations.token_hash.
- F17 [health.controller + server.ts] `/health/deep` pings the DB so a wedged instance stops reporting healthy.

**Frontend:**
- F15 [guided.css] two sub-14px sizes raised to the 14px floor. *(CSS value bump — not screen-verified; another chat holds the dev server.)*
- F16 [team.ts] add/edit/delete failures now surface the server's real message. *(Half: the alert→on-design-toast visual swap is PARKED — it needs a new component + a screenshot-verified design pass, per the see-it-on-screen rule.)*

## Goal
Fix what the Phase 1 audit confirms, in ranked order — the first confirmed item is already known: slow down repeated wrong-password login attempts.

## Changes
- Login-attempt throttling: after several wrong guesses on an account/IP, further tries get slowed or briefly blocked, with a plain message ("Too many attempts — try again in a minute"). Likely area: `backend/api/services/auth/` + the existing rate-limiter pattern in `backend/api/server.ts`.
- Then the next items from the audit's ranked fix-list, smallest-first, ONLY those Carl ticks when Phase 1 closes. (The exact list is set by the audit — this file gets updated with the agreed items before building starts.)
- Test-first per house rules; mirrored tests beside each change.

## Not in this phase
- 2FA (parked unless the audit raises it and Carl opts in).
- Anything the audit merely *suggests* but Carl didn't tick.
- Payments (Phase 3).

## Done when
- [ ] Wrong-password hammering is visibly slowed on the real login screen — verified by doing it, not by reading code.
- [ ] All ticked audit items are built, each with a passing test (`npm test` + `npm run typecheck` clean).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The burglar test** — on the login screen, type a real email with a WRONG password 6 times fast. You should get a plain "too many attempts, wait a moment" style message rather than endless retries. ❌ Not OK if you can keep guessing forever.
2. **The innocent test** — wait the stated moment, then log in with the RIGHT password. It should work normally. ❌ Not OK if a real user stays locked out.
3. **Nothing else broke** — log in, open a session, poke around Home. Everything behaves as yesterday. ❌ Not OK if anything unrelated feels off.
