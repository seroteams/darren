# Phase 2 — Quick hardening

**Part of:** [plan.md](plan.md) · **Status:** ⬜ (waits for Phase 1 green light)

## Goal
Three small, high-value hardening fixes so a leak can't happen through logs, headers, or git history.

## Changes
- **Gemini key out of the URL** — `backend/engine/ai-client.ts:251` sends the key as `?key=...`; move it to the `x-goog-api-key` header so it can't land in proxy/upstream logs. (OpenAI/Resend already use headers.)
- **Security headers** — add CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and HSTS to every response in the router's response path (`backend/api/server.ts`). Safety net behind the already-disciplined HTML escaping; stops clickjacking + protocol downgrade.
- **Purge committed test logs** — the `.gitignore` keep-set (`logs/may/2026_May24_*`, `2026_May25_*`, `logs/sweeps/*`) put real names/notes/briefings into git history. Remove those paths from history and tighten `.gitignore` so no run dir is ever kept. (History rewrite — coordinate; do last.)

## Not in this phase
- Anything parked in plan.md.

## Done when
- [ ] Gemini calls still work with the key in a header, not the URL (verify request shape).
- [ ] A response from the deployed app carries CSP + X-Frame-Options + X-Content-Type-Options + HSTS.
- [ ] `git log --all -- 'logs/may/2026_May24_*'` returns nothing; no real names remain in history.
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **App still works** — sign in, open a run, everything renders as before (headers are invisible to you; they don't change the UI). ❌ Not OK if any page breaks or won't load.
2. **Headers present** — I show you a check (curl) proving the four security headers are on the live responses. ❌ Not OK if any are missing.
3. **Names gone from history** — I show you that searching git history for the old test-log folders returns nothing. ❌ Not OK if a real name still appears.
