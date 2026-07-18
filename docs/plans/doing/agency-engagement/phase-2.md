# Phase 2 — The hardening

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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
